import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'

// ─── POST /api/employees/[id]/clock-out ───────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: employeeId } = await params
    const body = await req.json().catch(() => ({}))
    const breakMinutes = Number(body.breakMinutes ?? 0)

    // Find the active shift
    const activeShift = await prisma.shift.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
        employee: {
          location: { restaurantId: session.user.restaurantId },
        },
      },
    })

    if (!activeShift) {
      return NextResponse.json(
        { error: 'No active shift found for this employee' },
        { status: 404 }
      )
    }

    const clockOut = new Date()
    const clockInMs  = activeShift.clockIn!.getTime()
    const clockOutMs = clockOut.getTime()
    const totalMins  = Math.round((clockOutMs - clockInMs) / 60000)
    const netMins    = Math.max(0, totalMins - breakMinutes)

    const updatedShift = await prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        clockOut,
        breakMinutes,
        status: 'COMPLETED',
      },
    })

    await publishEvent('employee.clocked_out', {
      employeeId,
      shiftId:       updatedShift.id,
      locationId:    activeShift.locationId,
      clockIn:       activeShift.clockIn,
      clockOut,
      totalMinutes:  totalMins,
      netMinutes:    netMins,
      breakMinutes,
      actorId:       session.user.id,
    })

    return NextResponse.json({
      shift: updatedShift,
      summary: {
        totalMinutes: totalMins,
        netMinutes:   netMins,
        breakMinutes,
      },
    })
  } catch (error) {
    console.error('[POST /api/employees/:id/clock-out]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
