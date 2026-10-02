import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MANAGER' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Manager access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { action, clockOut, flagReason, status } = body // action: 'APPROVE' | 'CLOCK_OUT' | 'EDIT'

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    let updated = null

    if (action === 'APPROVE') {
      // Approve flagged anomaly -> mark regular ACTIVE or COMPLETED
      const newStatus = entry.clockOut ? 'COMPLETED' : 'ACTIVE'
      updated = await prisma.timeEntry.update({
        where: { id },
        data: {
          status: newStatus,
          flagReason: null,
        },
      })
    } else if (action === 'CLOCK_OUT') {
      // Force clock out by manager
      updated = await prisma.timeEntry.update({
        where: { id },
        data: {
          clockOut: clockOut ? new Date(clockOut) : new Date(),
          status: entry.status === 'FLAGGED' ? 'FLAGGED' : 'COMPLETED',
        },
      })
    } else if (action === 'EDIT') {
      updated = await prisma.timeEntry.update({
        where: { id },
        data: {
          ...(body.clockIn ? { clockIn: new Date(body.clockIn) } : {}),
          ...(body.clockOut ? { clockOut: new Date(body.clockOut) } : {}),
          ...(body.status ? { status: body.status } : {}),
          ...(typeof body.flagReason !== 'undefined' ? { flagReason: body.flagReason } : {}),
        },
      })
    }

    try {
      await publishEvent(
        'attendance.clock',
        {
          timeEntryId: id,
          action,
          status: updated?.status,
        },
        entry.locationId,
      )
    } catch {}

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/attendance/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
