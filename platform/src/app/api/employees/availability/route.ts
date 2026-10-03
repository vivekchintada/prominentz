import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const employeeIdParam = searchParams.get('employeeId')

    let targetEmployeeId = employeeIdParam

    if (targetEmployeeId) {
      if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const employee = await prisma.employee.findFirst({
        where: {
          id: targetEmployeeId,
          location: { restaurantId: session.user.restaurantId },
        },
        select: { id: true },
      })
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
      targetEmployeeId = employee.id
    } else {
      // Default to current user's employee record
      const emp = await prisma.employee.findFirst({
        where: {
          userId: session.user.id,
          location: { restaurantId: session.user.restaurantId },
        },
      })
      if (!emp) {
        return NextResponse.json([])
      }
      targetEmployeeId = emp.id
    }

    const availability = await prisma.workerAvailability.findMany({
      where: { employeeId: targetEmployeeId },
      orderBy: { dayOfWeek: 'asc' },
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error('[GET /api/employees/availability]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { employeeId, availabilities } = body // availabilities: Array<{ dayOfWeek: number, type: 'AVAILABLE' | 'UNAVAILABLE' | 'PREFERRED', startTime?: string, endTime?: string, notes?: string }>

    // Find employee record
    let targetEmployeeId = employeeId
    if (targetEmployeeId) {
      if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const employee = await prisma.employee.findFirst({
        where: {
          id: targetEmployeeId,
          location: { restaurantId: session.user.restaurantId },
        },
        select: { id: true },
      })
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
      targetEmployeeId = employee.id
    } else {
      const emp = await prisma.employee.findFirst({
        where: {
          userId: session.user.id,
          location: { restaurantId: session.user.restaurantId },
        },
      })
      if (!emp) {
        return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
      }
      targetEmployeeId = emp.id
    }

    if (!Array.isArray(availabilities)) {
      return NextResponse.json({ error: 'Availabilities must be an array' }, { status: 400 })
    }

    // Upsert availability for each day
    const updatedRecords = await Promise.all(
      availabilities.map(async (item) => {
        const existing = await prisma.workerAvailability.findFirst({
          where: {
            employeeId: targetEmployeeId,
            dayOfWeek: item.dayOfWeek,
          },
        })

        if (existing) {
          return prisma.workerAvailability.update({
            where: { id: existing.id },
            data: {
              type: item.type,
              startTime: item.startTime ?? null,
              endTime: item.endTime ?? null,
              notes: item.notes ?? null,
            },
          })
        } else {
          return prisma.workerAvailability.create({
            data: {
              employeeId: targetEmployeeId,
              dayOfWeek: item.dayOfWeek,
              type: item.type,
              startTime: item.startTime ?? null,
              endTime: item.endTime ?? null,
              notes: item.notes ?? null,
            },
          })
        }
      })
    )

    return NextResponse.json(updatedRecords)
  } catch (error) {
    console.error('[POST /api/employees/availability]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
