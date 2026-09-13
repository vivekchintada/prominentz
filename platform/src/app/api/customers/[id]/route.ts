import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

// ─── GET /api/customers/:id ───────────────────────────────────────────────────
// Returns full customer profile: identity, stats, order history, loyalty redemptions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = await verifyRestaurantPlan(session.user.restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Guest CRM is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            table: { select: { name: true } },
            items: {
              include: {
                menuItem: { select: { name: true } },
              },
            },
          },
        },
        redemptions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            reward: { select: { name: true, pointsRequired: true } },
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('[GET /api/customers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/customers/:id ─────────────────────────────────────────────────
// Update customer identity fields (name, phone, email, allergyTags, notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.customer.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const { name, phone, email, allergyTags, notes } = await req.json()

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name        !== undefined ? { name }        : {}),
        ...(phone       !== undefined ? { phone }       : {}),
        ...(email       !== undefined ? { email }       : {}),
        ...(allergyTags !== undefined ? { allergyTags } : {}),
        ...(notes       !== undefined ? { notes }       : {}),
      },
    })

    return NextResponse.json({ customer: updated })
  } catch (error) {
    console.error('[PATCH /api/customers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}