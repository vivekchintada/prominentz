import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
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

    // Confirm the payment belongs to this restaurant, and pull just what the
    // email body needs — the receipt page itself renders fresh data on demand.
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        order: { table: { location: { restaurantId: session.user.restaurantId } } },
      },
      select: {
        id: true,
        total: true,
        order: {
          select: {
            table: {
              select: {
                name: true,
                location: { select: { restaurant: { select: { name: true } } } },
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const url = `/receipts/${payment.id}`

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
