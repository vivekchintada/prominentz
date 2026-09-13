import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { sendWhatsAppWaitlistReady } from '@/lib/whatsapp'
import { sendWaitlistReady } from '@/lib/twilio'
import { z } from 'zod'

const updateWaitlistSchema = z.object({
  status: z.enum(['WAITING', 'SEATED', 'LEFT']).optional(),
  notify: z.boolean().optional(),
  tableName: z.string().optional(),
})

// ─── PATCH /api/waitlist/[id] ─────────────────────────────────────────────────
// Updates waitlist entry status or notifies guest via WhatsApp/SMS
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = updateWaitlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { status, notify, tableName } = parsed.data

    const existing = await prisma.waitlistEntry.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
      include: {
        location: {
          include: { restaurant: { select: { name: true } } },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
    }

    const restaurantName = existing.location?.restaurant?.name ?? 'Resto AI'

    // If notify requested, send WhatsApp & SMS table ready notifications
    if (notify && existing.guestPhone) {
      sendWhatsAppWaitlistReady({
        to: existing.guestPhone,
        guestName: existing.guestName,
        restaurantName,
        tableName,
      }).catch((err) => console.error('[Waitlist] WhatsApp notification error:', err))

      sendWaitlistReady(existing.guestPhone, existing.guestName, restaurantName)
        .catch((err) => console.error('[Waitlist] SMS notification error:', err))
    }

    const now = new Date()

    const updated = status
      ? await prisma.waitlistEntry.update({
          where: { id },
          data: {
            status,
            ...(status === 'SEATED' ? { seatedAt: now } : {}),
            ...(status === 'LEFT' ? { leftAt: now } : {}),
          },
        })
      : existing

    await publishEvent('waitlist.updated', {
      action:     notify ? 'notified' : 'updated',
      id:         updated.id,
      status:     updated.status,
      locationId: updated.locationId,
    })

    return NextResponse.json({ ...updated, notified: !!notify })
  } catch (error) {
    console.error('[PATCH /api/waitlist/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
