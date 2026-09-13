import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { z } from 'zod'

// ─── POST /api/employees/[id]/clock-in ────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: employeeId } = await params

    // Verify employee belongs to this restaurant
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        location: { restaurantId: session.user.restaurantId },
      },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    if (!employee.isActive) {
      return NextResponse.json({ error: 'Employee is not active' }, { status: 409 })
    }

    // Check for already active shift
    const existingShift = await prisma.shift.findFirst({
      where: { employeeId, status: 'ACTIVE' },
    })
    if (existingShift) {
      return NextResponse.json(
        { error: 'Employee is already clocked in' },
        { status: 409 }
      )
    }

    // Get user role
    const user = await prisma.user.findFirst({ where: { id: employee.userId } })

    const shift = await prisma.shift.create({
      data: {
        employeeId,
        locationId: employee.locationId,
        clockIn:    new Date(),
        status:     'ACTIVE',
        role:       user?.role ?? 'SERVER',
      },
    })

    await publishEvent('employee.clocked_in', {
      employeeId,
      shiftId:    shift.id,
      locationId: employee.locationId,
      clockIn:    shift.clockIn,
      actorId:    session.user.id,
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('[POST /api/employees/:id/clock-in]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
