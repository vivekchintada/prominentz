import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent } from '@/lib/stripe'
import { getRestaurantAccessStatus } from '@/lib/subscription-status'
import { z } from 'zod'

const createIntentSchema = z.object({
  orderId: z.string().min(1),
  amount:  z.number().min(0.50, 'Minimum card charge is $0.50'), // Stripe minimum charge is 50 cents
  confirm: z.boolean().optional().default(true),
  paymentMethod: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createIntentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { orderId, amount, confirm, paymentMethod } = parsed.data

    const { resolveUserLocation } = await import('@/lib/location-resolver')
    const resolved = await resolveUserLocation(session.user)
    const restaurantId = resolved?.restaurantId || session.user.restaurantId

    if (restaurantId) {
      const access = await getRestaurantAccessStatus(restaurantId)
      if (access?.isExpired) {
        return NextResponse.json(
          { error: 'Your free trial has ended. Subscribe to keep taking card payments.' },
          { status: 402 }
        )
      }
    }

    // Verify order belongs to this restaurant
    const initialOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { table: { location: { restaurantId } } },
          { server: { restaurantId } },
        ],
      },
    })

    // No fallback – if the order is not found in this restaurant's scope, reject the request
    const order = initialOrder

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (['PAID', 'VOIDED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Order is already settled or voided' },
        { status: 409 }
      )
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100)

    const { requireConnectedAccount } = await import('@/lib/stripe-connect')
    const stripeAccount = await requireConnectedAccount(restaurantId)

    const intent = await createPaymentIntent(amountInCents, orderId, {
      confirm,
      paymentMethod,
      stripeAccount,
    })

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      status: intent.status,
      stripeAccount: stripeAccount ?? null,
    })
  } catch (error: any) {
    console.error('[POST /api/payments/create-intent]', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: typeof error?.status === 'number' ? error.status : 500 }
    )
  }
}
