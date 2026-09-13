import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  unit:     z.string().min(1).max(20).optional(),
  minStock: z.number().min(0).optional(),
})

// ─── PATCH /api/inventory/[id] ────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Resolve location
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, locationId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data:  parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/inventory/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/inventory/[id] ───────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { id, locationId },
      include: {
        _count: { select: { recipes: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    if (existing._count.recipes > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item linked to active recipes. Unlink menu items first.' },
        { status: 409 }
      )
    }

    await prisma.inventoryItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/inventory/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
