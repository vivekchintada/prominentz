import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'

// ─── POST /api/reservations/[id]/no-show ──────────────────────────────────────
export async function POST(
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

    const existing = await prisma.reservation.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (!['PENDING', 'CONFIRMED'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot mark as No-Show — reservation is already ${existing.status}` },
        { status: 409 }
      )
    }

    // Mark reservation as NO_SHOW
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: 'NO_SHOW' },
      include: { table: { select: { id: true, name: true, capacity: true } } },
    })

    // Release the table if one was assigned
    if (existing.tableId) {
      await prisma.table.update({
        where: { id: existing.tableId },
        data:  { status: 'EMPTY' },
      })
      await publishEvent('table.status.changed', {
        tableId:  existing.tableId,
        status:   'EMPTY',
        actorId:  session.user.id,
      })
    }

    await publishEvent('reservation.no_show', {
      reservationId: id,
      guestName:     existing.guestName,
      tableId:       existing.tableId,
      actorId:       session.user.id,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[POST /api/reservations/:id/no-show]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
