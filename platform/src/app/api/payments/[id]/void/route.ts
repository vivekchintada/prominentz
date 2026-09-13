import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { refundPayment } from '@/lib/stripe'
import { voidPaymentSchema } from '@/lib/validations/payments'
import { logAuditEvent } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Voids require manager approval
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: paymentId } = await params
    const body = await req.json()
    const parsed = voidPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { reason } = parsed.data

    // Verify payment belongs to this restaurant
    const payment = await prisma.payment.findFirst({
      where: {
        id:    paymentId,
        order: { table: { location: { restaurantId: session.user.restaurantId } } },
      },
      include: {
        order: true,
        void:  true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    if (payment.status === 'VOIDED' || payment.void) {
      return NextResponse.json({ error: 'Payment is already voided' }, { status: 409 })
    }

    let refundId: string | null = null
    let refundAmount: number | null = null

    // If it was a card payment and has a Stripe transaction ID, trigger Stripe refund
    if (payment.method === 'CARD' && payment.stripePaymentIntentId) {
      try {
        const amountInCents = Math.round(Number(payment.total) * 100)
        const refund = await refundPayment(payment.stripePaymentIntentId, amountInCents)
        refundId = refund.id
        refundAmount = Number(payment.total)
      } catch (err) {
        console.error('[Stripe refund failed inside Payment Void]', err)
        return NextResponse.json(
          { error: 'Failed to issue card refund via Stripe gateway' },
          { status: 500 }
        )
      }
    }

    // Execute database void operations atomically
    await prisma.$transaction([
      // 1. Mark payment as voided
      prisma.payment.update({
        where: { id: paymentId },
        data:  { status: 'VOIDED' },
      }),
      // 2. Create void audit entry
      prisma.void.create({
        data: {
          paymentId,
          voidedBy:     session.user.id,
          reason,
          refundId,
          refundAmount,
        },
      }),
      // 3. Reset order status to OPEN so it can be re-settled or re-fired
      prisma.order.update({
        where: { id: payment.orderId },
        data:  { status: 'OPEN' },
      }),
      // 4. Reset all order items to PENDING so server can re-fire to kitchen
      prisma.orderItem.updateMany({
        where: { orderId: payment.orderId },
        data:  { status: 'PENDING' },
      }),
      // 5. Lock table back to active
      prisma.table.update({
        where: { id: payment.order.tableId },
        data:  { status: 'ACTIVE' },
      }),
    ])

    // Log event
    await prisma.orderEvent.create({
      data: {
        orderId:   payment.orderId,
        eventType: 'payment.voided',
        actorId:   session.user.id,
        metadata:  {
          paymentId,
          reason,
          refundId,
          refundAmount,
        },
      },
    })

    // Audit log entry
    await logAuditEvent({
      restaurantId: session.user.restaurantId,
      actorId:      session.user.id,
      actorName:    session.user.name ?? 'Unknown',
      action:       'VOID_PAYMENT',
      targetType:   'Payment',
      targetId:     paymentId,
      before: { status: 'COMPLETED', total: Number(payment.total), method: payment.method },
      after:  { status: 'VOIDED', reason, refundId, refundAmount },
    })

    // Realtime notifications
    await Promise.all([
      publishEvent(EVENTS.PAYMENT_VOIDED, {
        paymentId,
        orderId:  payment.orderId,
        voidedBy: session.user.name,
      }),
      publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
        tableId: payment.order.tableId,
        status:  'ACTIVE',
        actorId: session.user.id,
      }),
    ])

    return NextResponse.json({ success: true, refundId })
  } catch (error) {
    console.error('[POST /api/payments/:id/void]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
