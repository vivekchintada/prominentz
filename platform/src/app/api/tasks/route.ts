import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
// Returns active tasks for the current location/role
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status') // e.g. "OPEN" or "ALL"
    const taskType = searchParams.get('type')

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })

    let locationId = employee?.locationId
    if (!locationId) {
      const fallbackLoc = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = fallbackLoc?.id
    }

    if (!locationId) {
      return NextResponse.json({ tasks: [] })
    }

    const statusFilter =
      statusParam === 'ALL'
        ? undefined
        : statusParam
        ? (statusParam as any)
        : { in: ['OPEN', 'ACKNOWLEDGED'] }

    const tasks = await prisma.task.findMany({
      where: {
        locationId,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(taskType ? { taskType } : {}),
      },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    })

    return NextResponse.json({ tasks })
  } catch (error: any) {
    console.error('[GET /api/tasks]', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch tasks' }, { status: 500 })
  }
}

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
// Creates a new task or floor alert
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      message,
      taskType = 'FLOOR',
      priority = 'NORMAL',
      orderId,
      tableId,
      assignedToId,
      role,
      locationId: providedLocId,
    } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Task message is required' }, { status: 400 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
    })

    let locationId = providedLocId || employee?.locationId
    if (!locationId) {
      const loc = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      locationId = loc?.id
    }

    if (!locationId) {
      return NextResponse.json({ error: 'Could not resolve location for task' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        locationId,
        createdById: session.user.id,
        assignedToId: assignedToId || null,
        role: role || null,
        message,
        taskType,
        orderId: orderId || null,
        tableId: tableId || null,
        priority: priority as any,
        status: 'OPEN',
      },
      include: {
        employee: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    })

    try {
      await publishEvent(
        'task.created',
        {
          task,
          locationId,
          creatorName: session.user.name,
        },
        locationId
      )
    } catch {}

    return NextResponse.json({ task }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/tasks]', error)
    return NextResponse.json({ error: error?.message || 'Failed to create task' }, { status: 500 })
  }
}
