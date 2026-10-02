import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

const ruleSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  role: z.nativeEnum(UserRole),
  station: z.string().nullable().optional(),
  minStaff: z.number().int().min(0).default(1),
  targetStaff: z.number().int().min(1).default(2),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
  if (!location) return NextResponse.json({ error: 'No active location found' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const startDateStr = searchParams.get('startDate')

  const rules = await prisma.coverageRule.findMany({
    where: { locationId: location.id },
    orderBy: [{ dayOfWeek: 'asc' }, { role: 'asc' }],
  })

  // If startDate is passed, compute compliance against scheduled shifts
  let compliance = null
  if (startDateStr) {
    const start = new Date(startDateStr)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    const shifts = await prisma.shift.findMany({
      where: {
        locationId: location.id,
        scheduledStart: { gte: start, lt: end },
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        scheduledStart: true,
        scheduledEnd: true,
        role: true,
        station: true,
        isOpen: true,
      },
    })

    // Group shifts by dayOfWeek (0-6) and role
    const shiftsByDayRole: Record<string, number> = {}
    for (const shift of shifts) {
      if (!shift.scheduledStart) continue
      const d = new Date(shift.scheduledStart)
      const dow = d.getDay()
      const key = `${dow}_${shift.role}_${shift.station || 'all'}`
      shiftsByDayRole[key] = (shiftsByDayRole[key] || 0) + 1

      const genericKey = `${dow}_${shift.role}_all`
      if (shift.station) {
        shiftsByDayRole[genericKey] = (shiftsByDayRole[genericKey] || 0) + 1
      }
    }

    const evaluations = rules.map((rule) => {
      const keyWithStation = `${rule.dayOfWeek}_${rule.role}_${rule.station || 'all'}`
      const scheduledCount = shiftsByDayRole[keyWithStation] || 0
      let status: 'UNDERSTAFFED' | 'OPTIMAL' | 'OVERSTAFFED' = 'OPTIMAL'
      if (scheduledCount < rule.minStaff) {
        status = 'UNDERSTAFFED'
      } else if (scheduledCount > rule.targetStaff + 2) {
        status = 'OVERSTAFFED'
      }

      return {
        ruleId: rule.id,
        dayOfWeek: rule.dayOfWeek,
        role: rule.role,
        station: rule.station,
        minStaff: rule.minStaff,
        targetStaff: rule.targetStaff,
        scheduledCount,
        deficit: Math.max(0, rule.minStaff - scheduledCount),
        status,
      }
    })

    const understaffedCount = evaluations.filter((e) => e.status === 'UNDERSTAFFED').length

    compliance = {
      weekStart: start.toISOString(),
      evaluations,
      understaffedCount,
      isFullyCompliant: understaffedCount === 0,
    }
  }

  return NextResponse.json({
    locationId: location.id,
    rules,
    compliance,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
  if (!location) return NextResponse.json({ error: 'No active location found' }, { status: 400 })

  const parsed = ruleSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { dayOfWeek, role, station, minStaff, targetStaff, id } = parsed.data

  const rule = await prisma.coverageRule.upsert({
    where: id
      ? { id }
      : {
          locationId_dayOfWeek_role_station: {
            locationId: location.id,
            dayOfWeek,
            role,
            station: station || null as any,
          },
        },
    update: {
      minStaff,
      targetStaff,
    },
    create: {
      locationId: location.id,
      dayOfWeek,
      role,
      station: station || null,
      minStaff,
      targetStaff,
    },
  })

  return NextResponse.json({ rule }, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.coverageRule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
