import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent } from '@/lib/stripe'
import { z } from 'zod'

const createIntentSchema = z.object({
  orderId: z.string().min(1),
  amount:  z.number().min(0.50, 'Minimum card charge is $0.50'), // Stripe minimum charge is 50 cents
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

    const { orderId, amount } = parsed.data

    // Verify order belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        table: { location: { restaurantId: session.user.restaurantId } },
      },
    })

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

    const intent = await createPaymentIntent(amountInCents, orderId)

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    })
  } catch (error: any) {
    console.error('[POST /api/payments/create-intent]', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
