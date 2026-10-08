import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'

export const dynamic = 'force-dynamic'

function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields
    .map((val) => {
      if (val === null || val === undefined) return '""'
      let str = String(val).replace(/"/g, '""')
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`
      }
      return `"${str}"`
    })
    .join(',')
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
    if (!location) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'stock'

    let csvContent = ''
    const filename = `inventory-${type}-${new Date().toISOString().slice(0, 10)}.csv`

    if (type === 'stock') {
      const items = await prisma.inventoryItem.findMany({
        where: { locationId: location.id },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })

      const headers = ['ID', 'Name', 'Category', 'Unit', 'Current Stock', 'Min Stock', 'Par Stock', 'Unit Cost ($)', 'Total Stock Value ($)', 'Status']
      const rows = items.map((it) => {
        const value = Number(it.currentStock) * Number(it.unitCost)
        let status = 'In Stock'
        if (it.currentStock <= 0) status = 'Out of Stock'
        else if (it.currentStock <= it.minStock) status = 'Low Stock'

        return toCsvRow([
          it.id,
          it.name,
          it.category || 'General',
          it.unit,
          it.currentStock,
          it.minStock,
          it.parStock,
          Number(it.unitCost).toFixed(2),
          value.toFixed(2),
          status,
        ])
      })

      csvContent = [toCsvRow(headers), ...rows].join('\n')
    } else if (type === 'suppliers') {
      const suppliers = await prisma.supplier.findMany({
        where: { locationId: location.id },
        include: { _count: { select: { purchaseOrders: true } } },
        orderBy: { name: 'asc' },
      })

      const headers = ['ID', 'Supplier Name', 'Contact Person', 'Email', 'Phone', 'Lead Time (Days)', 'Total POs']
      const rows = suppliers.map((s) =>
        toCsvRow([s.id, s.name, s.contactName || '', s.email || '', s.phone || '', s.leadTimeDays, s._count.purchaseOrders])
      )

      csvContent = [toCsvRow(headers), ...rows].join('\n')
    } else if (type === 'pos') {
      const pos = await prisma.purchaseOrder.findMany({
        where: { locationId: location.id },
        include: { supplier: true, items: { include: { inventoryItem: true } } },
        orderBy: { createdAt: 'desc' },
      })

      const headers = ['PO Number', 'Supplier', 'Status', 'Total Cost ($)', 'Items Count', 'Ordered Date', 'Received Date', 'Notes']
      const rows = pos.map((p) =>
        toCsvRow([
          p.poNumber,
          p.supplier.name,
          p.status,
          Number(p.totalCost).toFixed(2),
          p.items.length,
          p.orderedAt ? new Date(p.orderedAt).toLocaleDateString() : '',
          p.receivedAt ? new Date(p.receivedAt).toLocaleDateString() : '',
          p.notes || '',
        ])
      )

      csvContent = [toCsvRow(headers), ...rows].join('\n')
    } else if (type === 'recipes') {
      const recipes = await prisma.recipeItem.findMany({
        where: { menuItem: { category: { restaurantId: session.user.restaurantId } } },
        include: { menuItem: { include: { category: true } }, inventoryItem: true },
        orderBy: [{ menuItem: { name: 'asc' } }, { inventoryItem: { name: 'asc' } }],
      })

      const headers = ['Menu Item', 'Category', 'Retail Price ($)', 'Ingredient', 'Portion Required', 'Unit', 'Ingredient Unit Cost ($)', 'Line Food Cost ($)']
      const rows = recipes.map((r) => {
        const lineCost = r.quantityRequired * Number(r.inventoryItem.unitCost)
        return toCsvRow([
          r.menuItem.name,
          r.menuItem.category.name,
          Number(r.menuItem.price).toFixed(2),
          r.inventoryItem.name,
          r.quantityRequired,
          r.inventoryItem.unit,
          Number(r.inventoryItem.unitCost).toFixed(2),
          lineCost.toFixed(4),
        ])
      })

      csvContent = [toCsvRow(headers), ...rows].join('\n')
    } else if (type === 'waste') {
      const logs = await prisma.wasteLog.findMany({
        where: { locationId: location.id },
        include: { inventoryItem: true },
        orderBy: { createdAt: 'desc' },
      })

      const headers = ['Date', 'Item Name', 'Quantity', 'Unit', 'Unit Cost ($)', 'Total Loss ($)', 'Reason', 'Status', 'Notes']
      const rows = logs.map((w) =>
        toCsvRow([
          new Date(w.createdAt).toLocaleString(),
          w.inventoryItem.name,
          w.quantity,
          w.inventoryItem.unit,
          Number(w.unitCost).toFixed(2),
          Number(w.totalCost).toFixed(2),
          w.reason,
          w.status,
          w.notes || '',
        ])
      )

      csvContent = [toCsvRow(headers), ...rows].join('\n')
    } else {
      return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 })
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/inventory/export]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
