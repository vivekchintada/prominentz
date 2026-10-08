import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { sendReservationConfirmation } from '@/lib/email'
import { sendReservationConfirmed } from '@/lib/twilio'
import { sendWhatsAppReservationConfirmed } from '@/lib/whatsapp'
import { getFeatureFlags } from '@/lib/settings-helpers'
import { resolveUserLocation } from '@/lib/location-resolver'
import { z } from 'zod'

const createReservationSchema = z.object({
  guestName:   z.string().min(1).max(100),
  guestPhone:  z.string().min(1).max(30),
  guestEmail:  z.string().email().optional().nullable(),
  partySize:   z.number().int().min(1).max(50),
  scheduledAt: z.string(),
  tableId:     z.string().optional().nullable(),
  notes:       z.string().max(500).optional().nullable(),
})

// ─── GET /api/reservations ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await resolveUserLocation(session.user)
    if (!resolved) {
      return NextResponse.json([])
    }
    const { locationId } = resolved

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status')
    const isAll = searchParams.get('all') === 'true'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thirtyDaysAhead = new Date(today)
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30)

    const startParam = searchParams.get('startDate')
    const endParam   = searchParams.get('endDate')

    let start = today
    let end = thirtyDaysAhead

    if (startParam) {
      const parsedStart = new Date(startParam)
      if (!isNaN(parsedStart.getTime())) start = parsedStart
    }
    if (endParam) {
      const parsedEnd = new Date(endParam)
      if (!isNaN(parsedEnd.getTime())) end = parsedEnd
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW']
    const statusFilter = statusParam && validStatuses.includes(statusParam.toUpperCase())
      ? { status: statusParam.toUpperCase() as any }
      : {}

    const dateFilter = isAll ? {} : { scheduledAt: { gte: start, lte: end } }

    const reservations = await prisma.reservation.findMany({
      where: {
        locationId,
        ...dateFilter,
        ...statusFilter,
      },
      include: {
        table: { select: { id: true, name: true, capacity: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json(reservations)
  } catch (error: unknown) {
    console.error('[GET /api/reservations]', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── POST /api/reservations ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await resolveUserLocation(session.user)
    if (!resolved) {
      return NextResponse.json({ error: 'Restaurant location not resolved. Please configure a dining location first.' }, { status: 400 })
    }
    const { locationId, restaurantId, restaurantName } = resolved

    // ── Feature flag: enableReservation ───────────────────────────────
    try {
      const flags = await getFeatureFlags(restaurantId)
      if (flags.enableReservation === false) {
        return NextResponse.json(
          { error: 'Reservations are currently disabled in store settings.' },
          { status: 403 },
        )
      }
    } catch {
      // Allow proceeding if feature flags lookup fails
    }

    const body = await req.json()
    const parsed = createReservationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const scheduledDate = new Date(parsed.data.scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid reservation date/time provided.' }, { status: 400 })
    }

    // If a tableId is provided, verify it belongs to this location
    if (parsed.data.tableId) {
      const table = await prisma.table.findFirst({
        where: { id: parsed.data.tableId, locationId },
      })
      if (!table) {
        return NextResponse.json({ error: 'Selected table not found.' }, { status: 404 })
      }

      // Check for table conflicts within ±90 minutes of the requested time
      const BUFFER_MS = 90 * 60 * 1000
      const windowStart = new Date(scheduledDate.getTime() - BUFFER_MS)
      const windowEnd   = new Date(scheduledDate.getTime() + BUFFER_MS)

      const conflict = await prisma.reservation.findFirst({
        where: {
          tableId: parsed.data.tableId,
          status:  { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
          scheduledAt: { gte: windowStart, lte: windowEnd },
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: `Table is already reserved within 90 minutes of this time slot (${new Date(conflict.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).` },
          { status: 409 }
        )
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        locationId,
        guestName:   parsed.data.guestName.trim(),
        guestPhone:  parsed.data.guestPhone.trim(),
        guestEmail:  parsed.data.guestEmail?.trim() || null,
        partySize:   parsed.data.partySize,
        scheduledAt: scheduledDate,
        tableId:     parsed.data.tableId || null,
        notes:       parsed.data.notes?.trim() || null,
        status:      'CONFIRMED',
      },
      include: {
        table: { select: { id: true, name: true, capacity: true } },
      },
    })

    // If table assigned, set it to RESERVED
    if (reservation.tableId) {
      try {
        await prisma.table.update({
          where: { id: reservation.tableId },
          data:  { status: 'RESERVED' },
        })
        await publishEvent('table.status.changed', {
          tableId: reservation.tableId,
          status:  'RESERVED',
          actorId: session.user.id,
        })
      } catch (err) {
        console.error('[Reservations] Table status update non-fatal error:', err)
      }
    }

    try {
      await publishEvent('reservation.confirmed', {
        reservationId: reservation.id,
        guestName:     reservation.guestName,
        partySize:     reservation.partySize,
        scheduledAt:   reservation.scheduledAt,
        tableId:       reservation.tableId,
        locationId,
      })
    } catch {}

    // Send email confirmation — fire-and-forget, never fails the reservation
    if (reservation.guestEmail) {
      try {
        sendReservationConfirmation({
          to:             reservation.guestEmail,
          guestName:      reservation.guestName,
          restaurantName,
          scheduledAt:    reservation.scheduledAt,
          partySize:      reservation.partySize,
          tableName:      reservation.table?.name,
          notes:          reservation.notes,
        }).catch((err) => {
          console.error('[Reservations] Background email error:', err)
        })
      } catch (err) {
        console.error('[Reservations] Background email dispatch error:', err)
      }
    }

    // Send SMS & WhatsApp confirmation — fire-and-forget, never fails the reservation
    if (reservation.guestPhone) {
      try {
        sendWhatsAppReservationConfirmed({
          to: reservation.guestPhone,
          guestName: reservation.guestName,
          restaurantName,
          dateTime: reservation.scheduledAt.toISOString(),
          partySize: reservation.partySize,
          tableNumber: reservation.table?.name,
        }).catch((err) => {
          console.error('[Reservations] Background WhatsApp error:', err)
        })

        sendReservationConfirmed(
          reservation.guestPhone,
          reservation.guestName,
          restaurantName,
          new Date(reservation.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          reservation.partySize,
          reservation.table?.name ?? undefined,
          reservation.notes ?? undefined
        ).catch((err) => {
          console.error('[Reservations] Background Twilio WhatsApp error:', err)
        })
      } catch (err) {
        console.error('[Reservations] Background SMS/WhatsApp dispatch error:', err)
      }
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/reservations]', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error occurred while creating reservation.' },
      { status: 500 }
    )
  }
}
