import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { fireOnlineOrder } from '@/lib/online-order-orchestration'
import { refundPayment } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  status: z.enum([
    'ACCEPTED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'DELIVERED',
    'REJECTED',
    'CANCELLED',
  ]),
  estimatedMinutes: z.number().int().min(5).max(240).optional(),
  reason: z.string().max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || !['OWNER', 'MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await params
  const order = await prisma.order.findFirst({
    where: {
      id,
      table: { location: { restaurantId: session.user.restaurantId } },
      onlineStatus: { not: null },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const now = new Date()
  const data: unknown = { onlineStatus: parsed.data.status }
  let refundIssued = false
  let refundDetails = null

  if (parsed.data.status === 'ACCEPTED') {
    data.acceptedAt = now
    data.estimatedReadyAt = new Date(now.getTime() + (parsed.data.estimatedMinutes || 20) * 60000)
  }

  if (parsed.data.status === 'REJECTED' || parsed.data.status === 'CANCELLED') {
    data.rejectedAt = now
    data.rejectionReason = parsed.data.reason || 'Unable to fulfil order'

    // If order was prepaid with card, initiate refund
    if (order.stripePaymentIntentId && (order.paymentStatus === 'PAID' || order.paymentStatus === 'PENDING')) {
      try {
        const refund = await refundPayment(order.stripePaymentIntentId)
        data.paymentStatus = 'REFUNDED'
        data.refundId = refund.id
        data.refundAmount = order.total
        refundIssued = true
        refundDetails = refund
      } catch (err) {
        console.error('[Refund Error on Rejection]', err)
      }
    }
  }

  if (parsed.data.status === 'READY') {
    data.readyAt = now
  }

  if (['COMPLETED', 'DELIVERED'].includes(parsed.data.status)) {
    data.completedAt = now
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data,
  })

  // Log order event
  await prisma.orderEvent.create({
    data: {
      orderId: id,
      eventType: `online_order.${parsed.data.status.toLowerCase()}`,
      actorId: session.user.id,
      metadata: {
        reason: parsed.data.reason || null,
        refundIssued,
        refundId: data.refundId || null,
      },
    },
  })

  if (refundIssued) {
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        eventType: 'online_order.refunded',
        actorId: session.user.id,
        metadata: {
          refundId: data.refundId,
          amount: Number(order.total),
        },
      },
    })
  }

  if (['REJECTED', 'CANCELLED', 'REFUNDED'].includes(parsed.data.status) || refundIssued) {
    try {
      const { reverseOrderPoints } = await import('@/lib/customer-crm')
      await reverseOrderPoints(id, `Online order ${parsed.data.status.toLowerCase()}`)
    } catch (e) {
      console.error('[Online Ordering] Points reversal error:', e)
    }
  }

  // Record AuditLog
  await prisma.auditLog.create({
    data: {
      restaurantId: session.user.restaurantId,
      actorId: session.user.id,
      actorName: session.user.name || 'Manager',
      action: parsed.data.status === 'REJECTED' ? 'REJECT_ONLINE_ORDER' : 'UPDATE_ONLINE_ORDER_STATUS',
      targetType: 'Order',
      targetId: id,
      before: { onlineStatus: order.onlineStatus, paymentStatus: order.paymentStatus },
      after: { onlineStatus: updatedOrder.onlineStatus, paymentStatus: updatedOrder.paymentStatus, reason: parsed.data.reason },
    },
  }).catch(() => {})

  // Fire to kitchen on acceptance if not scheduled for later
  if (parsed.data.status === 'ACCEPTED' && !order.scheduledFor) {
    await fireOnlineOrder(id, session.user.id)
  }

  return NextResponse.json({
    success: true,
    status: parsed.data.status,
    refundIssued,
    refundDetails,
  })
}
