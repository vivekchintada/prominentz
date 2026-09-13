import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSupplierSchema = z.object({
  name:         z.string().min(1).max(100),
  contactName:  z.string().optional().nullable(),
  email:        z.string().email().optional().nullable(),
  phone:        z.string().optional().nullable(),
  leadTimeDays: z.number().int().min(0).default(3),
})

// ─── GET /api/suppliers ───────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const suppliers = await prisma.supplier.findMany({
      where: { locationId },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('[GET /api/suppliers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/suppliers ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const body   = await req.json()
    const parsed = createSupplierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        locationId,
        name:         parsed.data.name,
        contactName:  parsed.data.contactName ?? null,
        email:        parsed.data.email ?? null,
        phone:        parsed.data.phone ?? null,
        leadTimeDays: parsed.data.leadTimeDays,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('[POST /api/suppliers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
