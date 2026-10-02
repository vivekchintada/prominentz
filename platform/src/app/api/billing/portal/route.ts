import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createBillingPortalSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found for user' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const origin = req.nextUrl.origin || 'http://localhost:3000'
    const returnUrl = `${origin}/dashboard/settings/billing`

    const portal = await createBillingPortalSession({
      customerId: restaurant.stripeCustomerId || `cus_mock_${restaurant.id.substring(0, 8)}`,
      returnUrl,
    })

    return NextResponse.json({
      url: portal.url,
    })
  } catch (error: any) {
    console.error('[POST /api/billing/portal]', error)
    return NextResponse.json({ error: error.message || 'Failed to open customer portal' }, { status: 500 })
  }
}
