import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveLocation } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const applySchema = z.object({
  targetStartDate: z.string().datetime(),
  templateIds:     z.array(z.string()).optional(),
})

// ─── POST /api/shifts/templates/apply ────────────────────────────────────────
// Instantiates shift templates onto a target week
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { locationId } = await resolveActiveLocation(session.user.id, session.user.restaurantId)
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = applySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const targetStart = new Date(parsed.data.targetStartDate)
    targetStart.setHours(0, 0, 0, 0)

    // Ensure Monday as base (day 1)
    const targetMonday = new Date(targetStart)
    const currentDay = targetMonday.getDay()
    const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay
    targetMonday.setDate(targetMonday.getDate() + diffToMon)

    const templates = await prisma.shiftTemplate.findMany({
      where: {
        locationId,
        ...(parsed.data.templateIds ? { id: { in: parsed.data.templateIds } } : {}),
      },
    })

    if (templates.length === 0) {
      return NextResponse.json({ error: 'No templates found to apply' }, { status: 400 })
    }

    // Default employee for unassigned placeholder (or first active employee with matching role)
    const staff = await prisma.employee.findMany({
      where: { locationId, isActive: true },
      include: { user: { select: { role: true } } },
    })

    if (staff.length === 0) {
      return NextResponse.json({ error: 'No active staff in location to schedule' }, { status: 400 })
    }

    const shiftsToCreate = templates.map((tmpl) => {
      // Day of week: 0 = Sun, 1 = Mon ... 6 = Sat
      const shiftDate = new Date(targetMonday)
      // targetMonday is day 1 (Mon). If tmpl.dayOfWeek is 0 (Sun), it's Sunday after Mon (+6 days). If 1, it's Mon (+0 days).
      const offsetDays = tmpl.dayOfWeek === 0 ? 6 : tmpl.dayOfWeek - 1
      shiftDate.setDate(targetMonday.getDate() + offsetDays)

      const [sH, sM] = tmpl.startTime.split(':').map(Number)
      const [eH, eM] = tmpl.endTime.split(':').map(Number)

      const start = new Date(shiftDate)
      start.setHours(sH, sM, 0, 0)

      const end = new Date(shiftDate)
      if (eH < sH) {
        // Over midnight
        end.setDate(end.getDate() + 1)
      }
      end.setHours(eH, eM, 0, 0)

      // Find best match employee by role or assign first available
      const matchingEmp = staff.find((e) => e.user.role === tmpl.role) || staff[0]

      return {
        locationId,
        employeeId:     matchingEmp.id,
        scheduledStart: start,
        scheduledEnd:   end,
        role:           tmpl.role,
        station:        tmpl.station ?? null,
        isOpen:         true, // initially open template shift
        status:         'SCHEDULED' as const,
        publishedAt:    null,
      }
    })

    const created = await prisma.$transaction(
      shiftsToCreate.map((data) => prisma.shift.create({ data }))
    )

    return NextResponse.json({
      success: true,
      count: created.length,
      message: `Applied ${created.length} shift template(s) to week of ${targetMonday.toLocaleDateString()}`,
    })
  } catch (error) {
    console.error('[POST /api/shifts/templates/apply]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
