import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'
import { logAuditEvent } from '@/lib/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const compOrderSchema = z.object({
  reason: z.string().min(1, 'Comp reason required').max(200),
  percentDiscount: z.number().min(1).max(100).optional(),
  compType: z.enum(['FULL_COMP', 'MANAGER_DISCOUNT']).default('FULL_COMP'),
})

// ─── POST /api/orders/[id]/comp ───────────────────────────────────────────────
// Applies a manager comp or discount to an open order (OWNER / MANAGER only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Manager approval required to comp orders' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const parsed = compOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { reason, percentDiscount = 100, compType } = parsed.data

    const order = await prisma.order.findFirst({
      where: { id, table: { location: { restaurantId: session.user.restaurantId } } },
      include: { table: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (['PAID', 'VOIDED'].includes(order.status)) {
      return NextResponse.json({ error: 'Cannot comp a closed or voided order' }, { status: 409 })
    }

    const previousSubtotal = Number(order.subtotal)
    const previousTax = Number(order.tax)
    const previousTotal = Number(order.total)

    let newSubtotal = previousSubtotal
    let newTax = previousTax
    let newTotal = previousTotal

    if (compType === 'FULL_COMP' || percentDiscount === 100) {
      newSubtotal = 0
      newTax = 0
      newTotal = 0
    } else {
      const discountFactor = (100 - percentDiscount) / 100
      newSubtotal = Number((previousSubtotal * discountFactor).toFixed(2))
      newTax = Number((previousTax * discountFactor).toFixed(2))
      newTotal = Number((newSubtotal + newTax).toFixed(2))
    }

    // Update order with comp note and recalculated totals
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        notes: order.notes
          ? `${order.notes} | [COMP: ${reason} (${percentDiscount}% off by ${session.user.name})]`
          : `[COMP: ${reason} (${percentDiscount}% off by ${session.user.name})]`,
      },
    })

    // Log order event
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        eventType: 'order.comped',
        actorId: session.user.id,
        metadata: {
          compType,
          percentDiscount,
          reason,
          previousTotal,
          newTotal,
          managerName: session.user.name,
        },
      },
    })

    // Log compliance audit event
    await logAuditEvent({
      restaurantId: session.user.restaurantId,
      actorId: session.user.id,
      actorName: session.user.name,
      action: 'COMP_ORDER',
      targetType: 'Order',
      targetId: id,
      before: { subtotal: previousSubtotal, tax: previousTax, total: previousTotal },
      after: { subtotal: newSubtotal, tax: newTax, total: newTotal, reason, percentDiscount },
    })

    // Real-time broadcast
    await publishEvent(EVENTS.ORDER_MODIFIED, {
      orderId: id,
      action: 'comped',
      total: newTotal,
      manager: session.user.name,
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      discountApplied: percentDiscount,
      newTotal,
    })
  } catch (error) {
    console.error('[POST /api/orders/:id/comp]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
