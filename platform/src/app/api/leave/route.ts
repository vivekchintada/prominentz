import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ─── GET /api/leave ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve location
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
    const statusFilter     = searchParams.get('status')
    const employeeIdFilter = searchParams.get('employeeId')

    const requests = await prisma.leaveRequest.findMany({
      where: {
        employee: { locationId },
        ...(statusFilter     ? { status:     statusFilter     as any } : {}),
        ...(employeeIdFilter ? { employeeId: employeeIdFilter }        : {}),
      },
      include: {
        employee: {
          select: { id: true, jobTitle: true, userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with user info
    const userIds = requests.map((r: { employee: { userId: string } }) => r.employee.userId)
    const users   = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const result = requests.map((r: typeof requests[number]) => ({
      ...r,
      employee: { ...r.employee, user: userMap.get(r.employee.userId) ?? null },
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/leave]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/leave ──────────────────────────────────────────────────────────
const createLeaveSchema = z.object({
  type:      z.enum(['SICK', 'VACATION', 'PERSONAL', 'UNPAID']),
  startDate: z.string().datetime(),
  endDate:   z.string().datetime(),
  reason:    z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body   = await req.json()
    const parsed = createLeaveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    if (new Date(parsed.data.startDate) > new Date(parsed.data.endDate)) {
      return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 })
    }

    // Find the submitting employee record
    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })
    if (!employee) {
      return NextResponse.json({ error: 'No active employee record found for your account' }, { status: 404 })
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type:       parsed.data.type,
        startDate:  new Date(parsed.data.startDate),
        endDate:    new Date(parsed.data.endDate),
        reason:     parsed.data.reason ?? null,
        status:     'PENDING',
      },
    })

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error('[POST /api/leave]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
