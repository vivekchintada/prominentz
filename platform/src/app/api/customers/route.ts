import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
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
        tier: true,
        _count: { select: { orders: true, redemptions: true } },
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'No active tenant found for user' }, { status: 400 })
    }

    // Verify PRO tier access
    const { allowed } = await verifyRestaurantPlan(restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Guest CRM is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const {
      name,
      phone,
      email,
      allergyTags,
      tags,
      notes,
      marketingConsentEmail,
      marketingConsentSms,
      marketingConsentWhatsApp,
      birthDate,
    } = await req.json()

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Customer name and phone number are required' }, { status: 400 })
    }

    const { findOrCreateCustomer } = await import('@/lib/customer-crm')
    const customer = await findOrCreateCustomer({
      restaurantId,
      phone,
      email,
      name,
      notes,
      marketingConsentEmail,
      marketingConsentSms,
    })

    // If extra fields like tags, allergies or birthDate were provided, update them
    if (allergyTags || tags || birthDate || marketingConsentWhatsApp !== undefined) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          ...(allergyTags !== undefined ? { allergyTags: Array.isArray(allergyTags) ? allergyTags : [] } : {}),
          ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [] } : {}),
          ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
          ...(marketingConsentWhatsApp !== undefined ? { marketingConsentWhatsApp: Boolean(marketingConsentWhatsApp) } : {}),
        },
      })
    }

    const refreshed = await prisma.customer.findUnique({
      where: { id: customer.id },
      include: { tier: true },
    })

    return NextResponse.json({ customer: refreshed }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/customers]', error)
    return NextResponse.json({ error: error?.message || 'Failed to save customer profile' }, { status: 500 })
  }
}
