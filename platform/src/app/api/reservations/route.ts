import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { sendReservationConfirmation } from '@/lib/email'
import { sendReservationConfirmed } from '@/lib/twilio'
import { sendWhatsAppReservationConfirmed } from '@/lib/whatsapp'
import { getFeatureFlags } from '@/lib/settings-helpers'
import { z } from 'zod'

const createReservationSchema = z.object({
  guestName:   z.string().min(1).max(100),
  guestPhone:  z.string().min(1).max(30),
  guestEmail:  z.string().email().optional().nullable(),
  partySize:   z.number().int().min(1).max(50),
  scheduledAt: z.string().datetime(),
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

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const isAll  = searchParams.get('all') === 'true'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 30) // Default 30-day window if no dates specified

    const startParam = searchParams.get('startDate')
    const endParam   = searchParams.get('endDate')
    const start = startParam ? new Date(startParam) : today
    const end   = endParam   ? new Date(endParam)   : tomorrow

    const dateFilter = isAll
      ? {}
      : { scheduledAt: { gte: start, lte: end } }

    const reservations = await prisma.reservation.findMany({
      where: {
        locationId,
        ...dateFilter,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        table: { select: { id: true, name: true, capacity: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('[GET /api/reservations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/reservations ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    let locationId = employee?.locationId
    if (!locationId) {
      const fallback = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
      locationId = fallback?.id
    }
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    // ── Feature flag: enableReservation ───────────────────────────────
    const flags = await getFeatureFlags(session.user.restaurantId)
    if (flags.enableReservation === false) {
      return NextResponse.json(
        { error: 'Reservations are currently disabled for this restaurant.' },
        { status: 403 },
      )
    }

    const body   = await req.json()
    const parsed = createReservationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // If a tableId is provided, verify it belongs to this location
    if (parsed.data.tableId) {
      const table = await prisma.table.findFirst({
        where: { id: parsed.data.tableId, locationId },
      })
      if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 })
      }

      // Check for table conflicts within ±90 minutes of the requested time
      const BUFFER_MS = 90 * 60 * 1000
      const slotStart = new Date(parsed.data.scheduledAt)
      const windowStart = new Date(slotStart.getTime() - BUFFER_MS)
      const windowEnd   = new Date(slotStart.getTime() + BUFFER_MS)

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
        guestName:   parsed.data.guestName,
        guestPhone:  parsed.data.guestPhone,
        guestEmail:  parsed.data.guestEmail ?? null,
        partySize:   parsed.data.partySize,
        scheduledAt: new Date(parsed.data.scheduledAt),
        tableId:     parsed.data.tableId ?? null,
        notes:       parsed.data.notes ?? null,
        status:      'CONFIRMED',
      },
      include: {
        table: { select: { id: true, name: true, capacity: true } },
      },
    })

    // If table assigned, set it to RESERVED
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

    await publishEvent('reservation.confirmed', {
      reservationId: reservation.id,
      guestName:     reservation.guestName,
      partySize:     reservation.partySize,
      scheduledAt:   reservation.scheduledAt,
      tableId:       reservation.tableId,
      locationId,
    })

    // Send email confirmation — fire-and-forget, never fails the reservation
    if (reservation.guestEmail) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        include: { restaurant: { select: { name: true } } },
      })
      const restaurantName = location?.restaurant?.name ?? 'The Restaurant'
      const tableName = reservation.table?.name

      sendReservationConfirmation({
        to:             reservation.guestEmail,
        guestName:      reservation.guestName,
        restaurantName,
        scheduledAt:    reservation.scheduledAt,
        partySize:      reservation.partySize,
        tableName,
        notes:          reservation.notes,
      }).catch((err) => {
        console.error('[Reservations] Background email error:', err)
      })
    }

    // Send SMS & WhatsApp confirmation
    if (reservation.guestPhone) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        include: { restaurant: { select: { name: true } } },
      })
      const restName = location?.restaurant?.name ?? 'Prominentz'
      
      // WhatsApp notification (Primary for international)
      sendWhatsAppReservationConfirmed({
        to: reservation.guestPhone,
        guestName: reservation.guestName,
        restaurantName: restName,
        dateTime: reservation.scheduledAt.toISOString(),
        partySize: reservation.partySize,
        tableNumber: reservation.table?.name,
        address: location?.address ?? undefined,
      }).catch((err) => {
        console.error('[Reservations] Background WhatsApp error:', err)
      })

      // Twilio WhatsApp (Sandbox for dev, production WA for live)
      sendReservationConfirmed(
        reservation.guestPhone,
        reservation.guestName,
        restName,
        new Date(reservation.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        reservation.partySize,
        reservation.table?.name ?? undefined,
        reservation.notes ?? undefined
      ).catch((err) => {
        console.error('[Reservations] Background Twilio WhatsApp error:', err)
      })
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    console.error('[POST /api/reservations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
