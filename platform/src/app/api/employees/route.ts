import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ─── GET /api/employees ────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
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

    const employees = await prisma.employee.findMany({
      where: { locationId },
      include: {
        shifts: {
          where: { status: 'ACTIVE' },
          select: { id: true, clockIn: true, role: true, status: true },
          take: 1,
          orderBy: { clockIn: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Enrich with user info
    const userIds = employees.map((e) => e.userId)
    const users   = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const result = employees.map((emp) => ({
      ...emp,
      user: userMap.get(emp.userId) ?? null,
      activeShift: emp.shifts[0] ?? null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/employees]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/employees ───────────────────────────────────────────────────────
const createEmployeeSchema = z.object({
  userId:   z.string().min(1),
  jobTitle: z.string().max(100).optional(),
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
    const parsed = createEmployeeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify the user belongs to the same restaurant
    const user = await prisma.user.findFirst({
      where: { id: parsed.data.userId, restaurantId: session.user.restaurantId },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found in this restaurant' }, { status: 404 })
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

    const newEmployee = await prisma.employee.create({
      data: {
        userId:    parsed.data.userId,
        locationId,
        jobTitle:  parsed.data.jobTitle ?? null,
        isActive:  true,
      },
    })

    return NextResponse.json(newEmployee, { status: 201 })
  } catch (error) {
    console.error('[POST /api/employees]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
