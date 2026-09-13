import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { splitPaymentSchema } from '@/lib/validations/payments'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = splitPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { orderId, splits } = parsed.data

    // Verify order exists and belongs to this restaurant
    const order = await prisma.order.findFirst({
      where: { id: orderId, table: { location: { restaurantId: session.user.restaurantId } } },
      include: { table: { select: { id: true, name: true, locationId: true } } },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status === 'PAID') {
      return NextResponse.json({ error: 'Order is already settled' }, { status: 409 })
    }

    // Sum details from splits
    const totalSubtotal = splits.reduce((acc, s) => acc + s.subtotal, 0)
    const totalTip = splits.reduce((acc, s) => acc + s.tip, 0)
    const totalPayment = splits.reduce((acc, s) => acc + s.total, 0)
    
    // We assume the tax is part of subtotal or splits. Let's calculate the tax diff if any
    const taxValue = Number(order.tax)

    // Derive the primary method: if all splits use the same method, use that;
    // otherwise default to CARD as the transaction anchor for the parent record
    const uniqueMethods = [...new Set(splits.map((s) => s.method))]
    const primaryMethod = uniqueMethods.length === 1 ? uniqueMethods[0] : 'CARD'

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create a parent Payment record representing the full checkout transaction
      const parentPayment = await tx.payment.create({
        data: {
          orderId,
          processedBy: session.user.id,
          method:      primaryMethod,
          status:      'COMPLETED',
          subtotal:    totalSubtotal,
          tax:         taxValue,
          tip:         totalTip,
          total:       totalPayment,
        },
      })

      // 2. Create the individual splits linked to it
      await tx.paymentSplit.createMany({
        data: splits.map((s) => ({
          paymentId:             parentPayment.id,
          guestRef:              s.guestRef,
          method:                s.method,
          subtotal:              s.subtotal,
          tip:                   s.tip,
          total:                 s.total,
          stripePaymentIntentId: s.stripePaymentIntentId ?? null,
        })),
      })

      // 3. Set order status to paid
      await tx.order.update({
        where: { id: orderId },
        data:  { status: 'PAID' },
      })

      // 4. Free the table
      await tx.table.update({
        where: { id: order.tableId },
        data:  { status: 'EMPTY' },
      })

      return parentPayment
    })

    // Log event
    await prisma.orderEvent.create({
      data: {
        orderId,
        eventType: 'payment.split_processed',
        actorId:   session.user.id,
        metadata:  {
          paymentId:  payment.id,
          splitCount: splits.length,
          total:      totalPayment,
          tip:        totalTip,
        },
      },
    })

    // Realtime notifications
    await Promise.all([
      publishEvent(EVENTS.PAYMENT_PROCESSED, {
        paymentId:   payment.id,
        orderId,
        total:       totalPayment,
        method:      'SPLIT',
        processedBy: session.user.name,
      }, order.table?.locationId),
      publishEvent(EVENTS.ORDER_MODIFIED, {
        orderId,
        status:      'PAID',
        tableName:   order.table?.name || 'Order',
        locationId:  order.table?.locationId,
        actorId:     session.user.id,
      }, order.table?.locationId),
      publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: order.tableId,
        status:  'EMPTY',
        actorId: session.user.id,
      }, order.table?.locationId),
    ])

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('[POST /api/payments/split]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
