import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { sendWhatsAppReservationConfirmed, sendWhatsAppReservationCancelled } from '@/lib/whatsapp'
import { sendReservationConfirmed, sendReservationCancelled } from '@/lib/twilio'
import { resolveUserLocation } from '@/lib/location-resolver'
import { z } from 'zod'

const updateReservationSchema = z.object({
  status:      z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW']).optional(),
  tableId:     z.string().nullable().optional(),
  guestName:   z.string().min(1).max(100).optional(),
  guestPhone:  z.string().min(1).max(30).optional(),
  guestEmail:  z.string().email().nullable().optional(),
  partySize:   z.number().int().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  notes:       z.string().max(500).nullable().optional(),
})

// ─── PATCH /api/reservations/[id] ─────────────────────────────────────────────
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
    const parsed = updateReservationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const resolved = await resolveUserLocation(session.user)
    const existing = await prisma.reservation.findFirst({
      where: {
        id,
        ...(resolved?.restaurantId ? { location: { restaurantId: resolved.restaurantId } } : {}),
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const { tableId, scheduledAt, status, ...rest } = parsed.data

    // If tableId or time is changing, check for conflicts on the new table/time
    const newTableId    = tableId !== undefined ? tableId : existing.tableId
    const newScheduledAt = scheduledAt ? new Date(scheduledAt) : existing.scheduledAt

    if ((tableId !== undefined || scheduledAt) && newTableId) {
      const BUFFER_MS = 90 * 60 * 1000
      const windowStart = new Date(newScheduledAt.getTime() - BUFFER_MS)
      const windowEnd   = new Date(newScheduledAt.getTime() + BUFFER_MS)

      const conflict = await prisma.reservation.findFirst({
        where: {
          id:     { not: id }, // exclude current reservation
          tableId: newTableId,
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

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...rest,
        ...(tableId !== undefined ? { tableId } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        table: { select: { id: true, name: true, capacity: true } },
      },
    })

    // If status changed to SEATED, free the table back to ACTIVE
    if (status === 'SEATED' && existing.tableId) {
      await prisma.table.update({
        where: { id: existing.tableId },
        data:  { status: 'ACTIVE' },
      })
      await publishEvent('table.status.changed', {
        tableId: existing.tableId,
        status:  'ACTIVE',
        actorId: session.user.id,
      })
    }

    // If status changed to CANCELLED or NO_SHOW and had table, free it
    if (['CANCELLED', 'NO_SHOW'].includes(status ?? '') && existing.tableId) {
      await prisma.table.update({
        where: { id: existing.tableId },
        data:  { status: 'EMPTY' },
      })
      await publishEvent('table.status.changed', {
        tableId: existing.tableId,
        status:  'EMPTY',
        actorId: session.user.id,
      })
    }

    // If table was newly assigned, set it to RESERVED
    if (tableId && tableId !== existing.tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data:  { status: 'RESERVED' },
      })
      await publishEvent('table.status.changed', {
        tableId,
        status:  'RESERVED',
        actorId: session.user.id,
      })
    }

    // If status changed to CONFIRMED, send confirmation message
    if (status === 'CONFIRMED' && existing.status !== 'CONFIRMED' && updated.guestPhone) {
      const location = await prisma.location.findUnique({
        where: { id: existing.locationId },
        include: { restaurant: { select: { name: true } } },
      })
      const restName = location?.restaurant?.name ?? 'Prominentz'
      
      sendWhatsAppReservationConfirmed({
        to: updated.guestPhone,
        guestName: updated.guestName,
        restaurantName: restName,
        dateTime: updated.scheduledAt.toISOString(),
        partySize: updated.partySize,
        tableNumber: updated.table?.name,
        address: location?.address ?? undefined,
      }).catch((err) => console.error('[Reservations] WhatsApp confirm error:', err))

      sendReservationConfirmed(
        updated.guestPhone,
        updated.guestName,
        restName,
        new Date(updated.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        updated.partySize,
        updated.table?.name ?? undefined,
        updated.notes ?? undefined
      ).catch((err) => console.error('[Reservations] Twilio confirm error:', err))
    }

    // If status changed to CANCELLED, send cancellation notice
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED' && updated.guestPhone) {
      const location = await prisma.location.findUnique({
        where: { id: existing.locationId },
        include: { restaurant: { select: { name: true } } },
      })
      const restName = location?.restaurant?.name ?? 'Prominentz'
      const formattedDate = new Date(updated.scheduledAt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

      sendWhatsAppReservationCancelled({
        to: updated.guestPhone,
        guestName: updated.guestName,
        restaurantName: restName,
        dateTime: updated.scheduledAt.toISOString(),
      }).catch((err) => console.error('[Reservations] WhatsApp cancel error:', err))

      sendReservationCancelled(
        updated.guestPhone,
        updated.guestName,
        restName,
        formattedDate
      ).catch((err) => console.error('[Reservations] Twilio cancel error:', err))
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/reservations/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/reservations/[id] ────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const resolved = await resolveUserLocation(session.user)
    const existing = await prisma.reservation.findFirst({
      where: {
        id,
        ...(resolved?.restaurantId ? { location: { restaurantId: resolved.restaurantId } } : {}),
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    await prisma.reservation.delete({ where: { id } })

    // Free table if it was reserved
    if (existing.tableId) {
      await prisma.table.update({
        where: { id: existing.tableId },
        data:  { status: 'EMPTY' },
      })
      await publishEvent('table.status.changed', {
        tableId: existing.tableId,
        status:  'EMPTY',
        actorId: session.user.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/reservations/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
