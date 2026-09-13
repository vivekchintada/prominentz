import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    let restaurantId = session?.user?.restaurantId

    if (!restaurantId) {
      const fallbackRestaurant = await prisma.restaurant.findFirst()
      restaurantId = fallbackRestaurant?.id
    }

    if (!restaurantId) {
      return NextResponse.json({ customers: [] })
    }

    // Verify PRO tier access for Guest CRM
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Guest CRM is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()

    const customers = await prisma.customer.findMany({
      where: {
        restaurantId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('[GET /api/customers]', error)
    return NextResponse.json({ error: 'Failed to fetch customer directory' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    let restaurantId = session?.user?.restaurantId

    if (!restaurantId) {
      const fallbackRestaurant = await prisma.restaurant.findFirst()
      restaurantId = fallbackRestaurant?.id
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'No active tenant found' }, { status: 400 })
    }

    // Verify PRO tier access
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Guest CRM is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const { name, phone, email, allergyTags, notes } = await req.json()

    if (!name || !phone) {
      return NextResponse.json({ error: 'Customer name and phone number are required' }, { status: 400 })
    }

    const customer = await prisma.customer.upsert({
      where: { phone },
      update: {
        name,
        email: email || undefined,
        allergyTags: Array.isArray(allergyTags) ? allergyTags : undefined,
        notes: notes || undefined,
      },
      create: {
        restaurantId,
        name,
        phone,
        email: email || null,
        allergyTags: Array.isArray(allergyTags) ? allergyTags : [],
        notes: notes || null,
      },
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/customers]', error)
    return NextResponse.json({ error: 'Failed to save customer profile' }, { status: 500 })
  }
}
