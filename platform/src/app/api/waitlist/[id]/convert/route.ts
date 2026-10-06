import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { resolveUserLocation } from '@/lib/location-resolver'
import { z } from 'zod'
import { sendWaitlistReady } from '@/lib/twilio'

const convertWaitlistSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  tableId:     z.string().nullable().optional(),
  notes:       z.string().max(500).nullable().optional(),
})

// ─── POST /api/waitlist/[id]/convert ──────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body   = await req.json().catch(() => ({}))
    const parsed = convertWaitlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const resolved = await resolveUserLocation(session.user)
    // Verify waitlist entry exists and is active
    const entry = await prisma.waitlistEntry.findFirst({
      where: {
        id,
        ...(resolved?.restaurantId ? { location: { restaurantId: resolved.restaurantId } } : {}),
      },
    })
    if (!entry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
    }

    if (entry.status !== 'WAITING') {
      return NextResponse.json(
        { error: `Cannot convert waitlist entry with status ${entry.status}` },
        { status: 409 }
      )
    }

    const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : new Date()

    // Create reservation record
    const reservation = await prisma.reservation.create({
      data: {
        locationId:  entry.locationId,
        guestName:   entry.guestName,
        guestPhone:  entry.guestPhone,
        partySize:   entry.partySize,
        scheduledAt,
        tableId:     parsed.data.tableId ?? null,
        notes:       parsed.data.notes ?? `Converted from walk-in waitlist (Arrived: ${new Date(entry.arrivedAt).toLocaleTimeString()})`,
        status:      parsed.data.tableId ? 'CONFIRMED' : 'PENDING',
      },
      include: {
        table: { select: { id: true, name: true, capacity: true } },
      },
    })

    // Mark waitlist entry as SEATED / CONVERTED
    await prisma.waitlistEntry.update({
      where: { id },
      data:  { status: 'SEATED', seatedAt: new Date() },
    })

    // Update table status if assigned
    if (reservation.tableId) {
      await prisma.table.update({
        where: { id: reservation.tableId },
        data:  { status: 'RESERVED' },
      })
      await publishEvent('table.status.changed', {
        tableId: reservation.tableId,
        status:  'RESERVED',
        actorId: session.user.id,
      })
    }

    await publishEvent('waitlist.converted', {
      waitlistId:    id,
      reservationId: reservation.id,
      guestName:     entry.guestName,
      locationId:    entry.locationId,
    })

    // Send Twilio SMS if guest has a phone number
    if (entry.guestPhone) {
      try {
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: session.user.restaurantId },
          select: { name: true },
        })
        await sendWaitlistReady(entry.guestPhone, entry.guestName, restaurant?.name ?? 'the restaurant')
      } catch (smsErr) {
        console.warn('[Waitlist Convert] SMS failed (non-fatal):', smsErr)
      }
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    console.error('[POST /api/waitlist/:id/convert]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
