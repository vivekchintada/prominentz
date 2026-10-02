import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ─── GET /api/shifts ───────────────────────────────────────────────────────────
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
    const employeeId = searchParams.get('employeeId')

    const defaultStart = new Date()
    defaultStart.setDate(defaultStart.getDate() - 7)
    defaultStart.setHours(0, 0, 0, 0)
    const defaultEnd = new Date()
    defaultEnd.setDate(defaultEnd.getDate() + 14)
    defaultEnd.setHours(23, 59, 59, 999)

    const startParam = searchParams.get('startDate')
    const endParam   = searchParams.get('endDate')
    const mineParam  = searchParams.get('mine') === 'true'
    const start = startParam ? new Date(startParam) : defaultStart
    const end   = endParam   ? new Date(endParam)   : defaultEnd

    let targetEmployeeId = employeeId
    if (mineParam && employee) {
      targetEmployeeId = employee.id
    }

    const shifts = await prisma.shift.findMany({
      where: {
        locationId,
        ...(targetEmployeeId ? { employeeId: targetEmployeeId } : {}),
        OR: [
          { scheduledStart: { gte: start, lte: end } },
          { createdAt:      { gte: start, lte: end } },
        ],
      },
      include: {
        employee: { include: {} },
        notes: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { scheduledStart: 'asc' },
    })

    // Enrich with user info
    const userIds = shifts.map((s) => s.employee.userId)
    const users   = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const result = shifts.map((shift) => ({
      ...shift,
      employee: {
        ...shift.employee,
        user: userMap.get(shift.employee.userId) ?? null,
      },
      workedMinutes: shift.clockIn && shift.clockOut
        ? Math.max(
            0,
            Math.round(
              (new Date(shift.clockOut).getTime() - new Date(shift.clockIn).getTime()) / 60000
            ) - (shift.breakMinutes ?? 0)
          )
        : null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/shifts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/shifts ──────────────────────────────────────────────────────────
const createShiftSchema = z.object({
  employeeId:     z.string().min(1),
  role:           z.enum(['OWNER', 'MANAGER', 'SERVER', 'KITCHEN']),
  scheduledStart: z.string().datetime(),
  scheduledEnd:   z.string().datetime(),
  breakMinutes:   z.number().int().min(0).max(240).default(0),
  station:        z.string().max(80).nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = createShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Resolve locationId from the employee
    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.employeeId, location: { restaurantId: session.user.restaurantId } },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check for overlapping scheduled or active shifts for this employee
    const newStart = new Date(parsed.data.scheduledStart)
    const newEnd   = new Date(parsed.data.scheduledEnd)

    if (newEnd <= newStart) {
      return NextResponse.json({ error: 'Shift end time must be after start time' }, { status: 400 })
    }

    const overlap = await prisma.shift.findFirst({
      where: {
        employeeId: parsed.data.employeeId,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        scheduledStart: { lt: newEnd },
        scheduledEnd:   { gt: newStart },
      },
    })
    if (overlap) {
      return NextResponse.json(
        { error: 'Employee already has an active or scheduled shift overlapping with this time period.' },
        { status: 409 }
      )
    }

    const shift = await prisma.shift.create({
      data: {
        employeeId:     parsed.data.employeeId,
        locationId:     employee.locationId,
        role:           parsed.data.role,
        scheduledStart: newStart,
        scheduledEnd:   newEnd,
        breakMinutes:   parsed.data.breakMinutes,
        station:        parsed.data.station ?? null,
        hourlyRateSnapshot: employee.hourlyRate,
        status:         'SCHEDULED',
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('[POST /api/shifts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
