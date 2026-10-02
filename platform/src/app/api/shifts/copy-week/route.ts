import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveLocation } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const copyWeekSchema = z.object({
  sourceStartDate: z.string().datetime(),
  targetStartDate: z.string().datetime(),
})

// ─── POST /api/shifts/copy-week ──────────────────────────────────────────────
// Copies an entire week's schedule to a target week as unpublished drafts
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
    const parsed = copyWeekSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const sourceStart = new Date(parsed.data.sourceStartDate)
    const sourceEnd = new Date(sourceStart)
    sourceEnd.setDate(sourceEnd.getDate() + 7)

    const targetStart = new Date(parsed.data.targetStartDate)
    const dayOffsetMs = targetStart.getTime() - sourceStart.getTime()

    // Fetch existing source shifts
    const sourceShifts = await prisma.shift.findMany({
      where: {
        locationId,
        scheduledStart: { gte: sourceStart, lt: sourceEnd },
        status: { in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] },
      },
    })

    if (sourceShifts.length === 0) {
      return NextResponse.json({ error: 'No shifts found in the source week to copy' }, { status: 400 })
    }

    // Duplicate each shift onto the target week as draft
    const newShifts = sourceShifts.map((s) => {
      const newStart = s.scheduledStart ? new Date(s.scheduledStart.getTime() + dayOffsetMs) : null
      const newEnd = s.scheduledEnd ? new Date(s.scheduledEnd.getTime() + dayOffsetMs) : null

      return {
        locationId,
        employeeId:     s.employeeId,
        scheduledStart: newStart,
        scheduledEnd:   newEnd,
        breakMinutes:   s.breakMinutes,
        station:        s.station,
        role:           s.role,
        isOpen:         s.isOpen,
        status:         'SCHEDULED' as const,
        publishedAt:    null, // Created as unpublished drafts
        publishedBy:    null,
      }
    })

    const created = await prisma.$transaction(
      newShifts.map((data) => prisma.shift.create({ data }))
    )

    return NextResponse.json({
      success: true,
      copiedCount: created.length,
      message: `Copied ${created.length} shift(s) into target week as draft schedule.`,
    })
  } catch (error) {
    console.error('[POST /api/shifts/copy-week]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
