import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveLocation } from '@/lib/location-context'
import { publishEvent, EVENTS } from '@/lib/redis'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { locationId } = await resolveActiveLocation(session.user.id, session.user.restaurantId)
    if (!locationId) return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })

    const start = new Date(parsed.data.startDate)
    const end = new Date(parsed.data.endDate)

    const shifts = await prisma.shift.findMany({
      where: {
        locationId,
        status: 'SCHEDULED',
        scheduledStart: { gte: start },
        scheduledEnd: { lte: end },
      },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            availability: true,
            leaveRequests: {
              where: {
                status: 'APPROVED',
                startDate: { lte: end },
                endDate: { gte: start },
              },
            },
          },
        },
      },
      orderBy: { scheduledStart: 'asc' },
    })

    if (!shifts.length) {
      return NextResponse.json({ error: 'No scheduled shifts found for this week' }, { status: 400 })
    }

    const warnings: string[] = []
    const minutesByEmployee = new Map<string, number>()

    for (const shift of shifts) {
      if (!shift.scheduledStart || !shift.scheduledEnd) continue
      const minutes = Math.max(0, (shift.scheduledEnd.getTime() - shift.scheduledStart.getTime()) / 60000 - shift.breakMinutes)
      minutesByEmployee.set(shift.employeeId, (minutesByEmployee.get(shift.employeeId) ?? 0) + minutes)

      if (shift.employee.leaveRequests.some(l => l.startDate <= shift.scheduledEnd! && l.endDate >= shift.scheduledStart!)) {
        warnings.push(`Leave conflict on ${shift.scheduledStart.toLocaleDateString()}`)
      }
      const day = shift.scheduledStart.getDay()
      const blocked = shift.employee.availability.some(
        a => a.dayOfWeek === day &&
             a.type === 'UNAVAILABLE' &&
             (!a.specificDate || a.specificDate.toDateString() === shift.scheduledStart!.toDateString())
      )
      if (blocked) {
        warnings.push(`Availability conflict on ${shift.scheduledStart.toLocaleDateString()}`)
      }
    }

    for (const shift of shifts) {
      const hours = (minutesByEmployee.get(shift.employeeId) ?? 0) / 60
      if (hours > shift.employee.maxWeeklyHours) {
        warnings.push(`Employee ${shift.employeeId} is ${Math.round((hours - shift.employee.maxWeeklyHours) * 10) / 10}h over their weekly limit`)
      }
    }

    const now = new Date()
    await prisma.$transaction(
      shifts.map(s =>
        prisma.shift.update({
          where: { id: s.id },
          data: {
            publishedAt: now,
            publishedBy: session.user.id,
            hourlyRateSnapshot: s.employee.hourlyRate,
          },
        })
      )
    )

    // Snapshot ScheduleVersion
    const priorVersions = await prisma.scheduleVersion.count({
      where: { locationId, weekStart: start },
    })

    const scheduleVersion = await prisma.scheduleVersion.create({
      data: {
        locationId,
        weekStart:     start,
        versionNumber: priorVersions + 1,
        shiftCount:    shifts.length,
        publishedBy:   session.user.id,
        publishedAt:   now,
        notes:         warnings.length > 0 ? `Published with ${warnings.length} warning(s)` : 'Clean publication',
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        restaurantId: session.user.restaurantId,
        action:       'SCHEDULE_PUBLISHED',
        targetType:   'ScheduleVersion',
        targetId:     scheduleVersion.id,
        actorId:      session.user.id,
        actorName:    session.user.name || 'Manager',
        after: {
          weekStart:     start.toISOString(),
          versionNumber: scheduleVersion.versionNumber,
          shiftCount:    shifts.length,
        },
      },
    }).catch(() => {})

    try {
      await publishEvent(EVENTS.SHIFT_PUBLISHED, {
        publishedBy: session.user.name || 'Manager',
        publishedAt: now.toISOString(),
        shiftCount: shifts.length,
        versionNumber: scheduleVersion.versionNumber,
        timeframe: { startDate: parsed.data.startDate, endDate: parsed.data.endDate },
      }, locationId)
    } catch (redisError) {
      console.warn('Redis publishEvent warning:', redisError)
    }

    return NextResponse.json({
      success: true,
      count: shifts.length,
      shiftCount: shifts.length,
      versionNumber: scheduleVersion.versionNumber,
      message: `Successfully published version ${scheduleVersion.versionNumber} with ${shifts.length} shift(s).`,
      warnings: [...new Set(warnings)],
    })
  } catch (error) {
    console.error('[POST /api/shifts/publish]', error)
    return NextResponse.json({ error: 'Failed to publish schedule' }, { status: 500 })
  }
}
