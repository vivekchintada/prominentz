import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { z } from 'zod'

const createWaitlistSchema = z.object({
  guestName:      z.string().min(1).max(100),
  guestPhone:     z.string().min(1).max(30),
  partySize:      z.number().int().min(1).max(50),
  quotedWaitMins: z.number().int().min(0).default(20),
})

// ─── GET /api/waitlist ────────────────────────────────────────────────────────
// Returns all active waitlist entries (WAITING status)
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

    const entries = await prisma.waitlistEntry.findMany({
      where: { locationId, status: 'WAITING' },
      orderBy: { arrivedAt: 'asc' },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('[GET /api/waitlist]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/waitlist ───────────────────────────────────────────────────────
// Adds a guest party to the waitlist queue
export async function POST(req: NextRequest) {
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

    const body   = await req.json()
    const parsed = createWaitlistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        locationId,
        guestName:      parsed.data.guestName,
        guestPhone:     parsed.data.guestPhone,
        partySize:      parsed.data.partySize,
        quotedWaitMins: parsed.data.quotedWaitMins,
        status:         'WAITING',
      },
    })

    await publishEvent('waitlist.updated', {
      action:  'added',
      id:      entry.id,
      name:    entry.guestName,
      size:    entry.partySize,
      minutes: entry.quotedWaitMins,
      locationId,
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('[POST /api/waitlist]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
