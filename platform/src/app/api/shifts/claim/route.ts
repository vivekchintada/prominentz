import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveLocation } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const claimSchema = z.object({
  shiftId: z.string().min(1),
})

// ─── POST /api/shifts/claim ──────────────────────────────────────────────────
// Allows an employee to claim an open/unassigned shift with anti-overlap and leave protection
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: {
        leaveRequests: {
          where: { status: 'APPROVED' },
        },
      },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found or inactive' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = claimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { shiftId } = parsed.data

    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, locationId: employee.locationId },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (!shift.isOpen) {
      return NextResponse.json({ error: 'This shift is not open for claiming' }, { status: 409 })
    }

    if (!shift.scheduledStart || !shift.scheduledEnd) {
      return NextResponse.json({ error: 'Shift time is undefined' }, { status: 400 })
    }

    // 1. Anti-overlap validation: Ensure employee does not already have an active/scheduled shift at this time
    const overlapping = await prisma.shift.findFirst({
      where: {
        employeeId:     employee.id,
        id:             { not: shiftId },
        status:         { in: ['SCHEDULED', 'ACTIVE'] },
        scheduledStart: { lt: shift.scheduledEnd },
        scheduledEnd:   { gt: shift.scheduledStart },
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'Cannot claim: You already have a conflicting shift scheduled during this time.' },
        { status: 409 }
      )
    }

    // 2. Leave conflict validation
    const leaveConflict = employee.leaveRequests.some(
      (l) => l.startDate <= shift.scheduledEnd! && l.endDate >= shift.scheduledStart!
    )
    if (leaveConflict) {
      return NextResponse.json(
        { error: 'Cannot claim: You have approved leave during this shift.' },
        { status: 409 }
      )
    }

    // 3. Atomically assign the shift to the employee
    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        employeeId: employee.id,
        isOpen:     false,
      },
      include: {
        employee: { select: { id: true, jobTitle: true, user: { select: { name: true } } } },
      },
    })

    // 4. Audit trail
    await prisma.auditLog.create({
      data: {
        restaurantId: session.user.restaurantId,
        action:       'SHIFT_CLAIMED',
        targetType:   'Shift',
        targetId:     shiftId,
        actorId:      session.user.id,
        actorName:    session.user.name || 'Staff',
        after: {
          shiftStart: shift.scheduledStart?.toISOString() ?? null,
          shiftEnd:   shift.scheduledEnd?.toISOString() ?? null,
          role:       shift.role,
        },
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Open shift claimed successfully!',
      shift:   updated,
    })
  } catch (error) {
    console.error('[POST /api/shifts/claim]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
