import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redis, publishEvent, EVENTS } from '@/lib/redis'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const assistanceSchema = z.object({
  locationId: z.string().min(1),
  tableId: z.string().min(1),
  type: z.enum(['CALL_WAITER', 'REQUEST_BILL', 'WATER', 'CUTLERY', 'OTHER']),
  notes: z.string().max(200).optional(),
})

// ── GET: List active assistance requests for a location or check specific table ─
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')
    const tableId = searchParams.get('tableId')

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    if (tableId) {
      const raw = await redis.get(`resto:assistance:${locationId}:${tableId}`)
      const active = raw ? JSON.parse(raw) : null
      return NextResponse.json({ active })
    }

    // Fetch all active assistance keys for this location
    const setKey = `resto:assistance-set:${locationId}`
    const activeTableIds = await redis.smembers(setKey)

    if (!activeTableIds || activeTableIds.length === 0) {
      return NextResponse.json({ requests: [] })
    }

    const keys = activeTableIds.map((tid) => `resto:assistance:${locationId}:${tid}`)
    const rawList = await redis.mget(...keys)
    const requests = rawList
      .filter((r): r is string => Boolean(r))
      .map((r) => JSON.parse(r))

    return NextResponse.json({ requests })
  } catch (err) {
    console.error('[GET /api/table-order/assistance]', err)
    return NextResponse.json({ error: 'Failed to fetch assistance status' }, { status: 500 })
  }
}

// ── POST: Guest calls waiter or requests bill from table ───────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = assistanceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { locationId, tableId, type, notes } = parsed.data

    // Verify table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, name: true, locationId: true },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const tableName = table.name || `Table ${tableId.slice(-4)}`
    const requestedAt = new Date().toISOString()

    const payload = {
      tableId,
      tableName,
      locationId,
      type,
      notes: notes || null,
      requestedAt,
    }

    // Cache in Redis for 1 hour
    const redisKey = `resto:assistance:${locationId}:${tableId}`
    const setKey = `resto:assistance-set:${locationId}`
    await redis.set(redisKey, JSON.stringify(payload), 'EX', 3600)
    await redis.sadd(setKey, tableId)

    // Broadcast real-time SSE event to /server and /pos
    await publishEvent(EVENTS.TABLE_ASSISTANCE_REQUESTED, payload, locationId)

    return NextResponse.json({
      success: true,
      message: type === 'REQUEST_BILL' ? 'Bill requested! Staff has been notified.' : 'Waiter called! Someone is on the way.',
      request: payload,
    })
  } catch (err) {
    console.error('[POST /api/table-order/assistance]', err)
    return NextResponse.json({ error: 'Failed to send assistance request' }, { status: 500 })
  }
}

// ── PATCH: Staff acknowledges and clears the request ──────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { locationId, tableId } = body

    if (!locationId || !tableId) {
      return NextResponse.json({ error: 'locationId and tableId required' }, { status: 400 })
    }

    const redisKey = `resto:assistance:${locationId}:${tableId}`
    const setKey = `resto:assistance-set:${locationId}`

    await redis.del(redisKey)
    await redis.srem(setKey, tableId)

    // Broadcast acknowledgment event so server floor & pos clear the alert
    await publishEvent(
      EVENTS.TABLE_ASSISTANCE_ACKNOWLEDGED,
      { tableId, locationId, acknowledgedBy: session.user.name || session.user.email },
      locationId
    )

    return NextResponse.json({ success: true, tableId })
  } catch (err) {
    console.error('[PATCH /api/table-order/assistance]', err)
    return NextResponse.json({ error: 'Failed to acknowledge request' }, { status: 500 })
  }
}
