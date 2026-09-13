import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSupplierSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  contactName:  z.string().optional().nullable(),
  email:        z.string().email().optional().nullable(),
  phone:        z.string().optional().nullable(),
  leadTimeDays: z.number().int().min(0).optional(),
})

// ─── GET /api/suppliers/[id] ──────────────────────────────────────────────────
// Returns supplier details with full purchase order history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        location: { restaurantId: session.user.restaurantId },
      },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            items: true,
          },
        },
        _count: {
          select: { purchaseOrders: true },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('[GET /api/suppliers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/suppliers/[id] ────────────────────────────────────────────────
// Updates supplier contact and lead time information
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
    const parsed = updateSupplierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.supplier.findFirst({
      where: {
        id,
        location: { restaurantId: session.user.restaurantId },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.contactName !== undefined ? { contactName: parsed.data.contactName } : {}),
        ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        ...(parsed.data.leadTimeDays !== undefined ? { leadTimeDays: parsed.data.leadTimeDays } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/suppliers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/suppliers/[id] ───────────────────────────────────────────────
// Deletes a supplier if no active purchase orders depend on it
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

    const existing = await prisma.supplier.findFirst({
      where: {
        id,
        location: { restaurantId: session.user.restaurantId },
      },
      include: {
        purchaseOrders: {
          where: { status: { in: ['DRAFT', 'ORDERED'] } },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    if (existing.purchaseOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete supplier with active/pending purchase orders. Complete or cancel them first.' },
        { status: 409 }
      )
    }

    await prisma.supplier.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/suppliers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
