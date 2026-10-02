import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveLocation } from '@/lib/location-context'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const templateSchema = z.object({
  name:      z.string().min(2),
  role:      z.enum(['SERVER', 'KITCHEN', 'MANAGER', 'OWNER']),
  station:   z.string().optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
})

// ─── GET /api/shifts/templates ───────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { locationId } = await resolveActiveLocation(session.user.id, session.user.restaurantId)
    if (!locationId) {
      return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
    }

    const templates = await prisma.shiftTemplate.findMany({
      where: { locationId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('[GET /api/shifts/templates]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/shifts/templates ──────────────────────────────────────────────
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
    const parsed = templateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const template = await prisma.shiftTemplate.create({
      data: {
        locationId,
        name:      parsed.data.name,
        role:      parsed.data.role,
        station:   parsed.data.station ?? null,
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime:   parsed.data.endTime,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('[POST /api/shifts/templates]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
