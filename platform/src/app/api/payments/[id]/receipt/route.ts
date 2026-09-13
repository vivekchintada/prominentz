import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateReceiptHtml } from '@/lib/receipts'
import { sendReceiptEmail } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: paymentId } = await params
    const body = await req.json().catch(() => ({}))
    const { sentTo } = body

    // Fetch complete dataset for the receipt
    const payment = await prisma.payment.findFirst({
      where: {
        id:    paymentId,
        order: { table: { location: { restaurantId: session.user.restaurantId } } },
      },
      include: {
        order: {
          include: {
            table: {
              include: {
                location: {
                  include: {
                    restaurant: true,
                  },
                },
              },
            },
            server: { select: { name: true } },
            items: {
              include: {
                menuItem: { select: { name: true } },
              },
            },
          },
        },
        splits: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Build items payload
    const receiptItems = payment.order.items.map((item) => ({
      name:        item.menuItem.name,
      quantity:    item.quantity,
      price:       Number(item.priceAtOrder),
      modifiers:   item.modifiers,
      specialNote: item.specialNote,
    }))

    // Build splits payload if split checkout was processed
    const receiptSplits = payment.splits.map((s) => ({
      guestRef: s.guestRef,
      total:    Number(s.total),
      method:   s.method,
    }))

    // Extract coupon info from order notes if present
    const couponMatch = payment.order.notes?.match(/Coupon:\s*([A-Za-z0-9_-]+)(?:\s*\(-?\$?([\d.]+)\))?/i)
    const couponCode = couponMatch ? couponMatch[1] : undefined
    let couponDiscount = couponMatch && couponMatch[2] ? parseFloat(couponMatch[2]) : undefined

    const itemsSubtotal = receiptItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (!couponDiscount && itemsSubtotal > Number(payment.subtotal) + 0.01) {
      couponDiscount = Number((itemsSubtotal - Number(payment.subtotal)).toFixed(2))
    }

    // Invoke builder
    const url = await generateReceiptHtml({
      restaurantName: payment.order.table.location.restaurant.name,
      locationName:   payment.order.table.location.name,
      address:        payment.order.table.location.address || '12 Restaurant Row',
      phone:          payment.order.table.location.phone || '+1 (555) 000-0000',
      paymentId:      payment.id,
      orderId:        payment.orderId,
      serverName:     payment.order.server?.name || 'QR Self-Order',
      tableName:      payment.order.table.name,
      createdAt:      payment.createdAt,
      method:         payment.method,
      items:          receiptItems,
      itemsSubtotal,
      couponCode,
      couponDiscount,
      subtotal:       Number(payment.subtotal),
      tax:            Number(payment.tax),
      tip:            Number(payment.tip),
      total:          Number(payment.total),
      cashReceived:  payment.cashReceived ? Number(payment.cashReceived) : undefined,
      cashChange:    payment.cashChange ? Number(payment.cashChange) : undefined,
      stripeIntent:  payment.stripePaymentIntentId || undefined,
      splits:        receiptSplits,
    })

    // Upsert receipt record
    const receipt = await prisma.receipt.upsert({
      where: { paymentId },
      create: {
        paymentId,
        url,
        sentTo: sentTo || null,
        sentAt: sentTo ? new Date() : null,
      },
      update: {
        url,
        sentTo: sentTo || null,
        sentAt: sentTo ? new Date() : null,
      },
    })

    if (sentTo) {
      // Fire-and-forget email delivery — does not block or fail the response
      sendReceiptEmail({
        to: sentTo,
        restaurantName: payment.order.table.location.restaurant.name,
        total: Number(payment.total),
        receiptUrl: url,
        tableName: payment.order.table.name,
        paymentId: payment.id,
      }).catch((err) => {
        console.error('[Receipt] Background email error:', err)
      })
    }

    return NextResponse.json({ ...receipt, emailSent: !!sentTo })
  } catch (error) {
    console.error('[POST /api/payments/:id/receipt]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
