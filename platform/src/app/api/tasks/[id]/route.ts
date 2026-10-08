import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'

export const dynamic = 'force-dynamic'

// ─── PATCH /api/tasks/[id] ───────────────────────────────────────────────────
// Updates task status (ACKNOWLEDGED or RESOLVED)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body

    if (!status || !['ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status (ACKNOWLEDGED or RESOLVED) is required' }, { status: 400 })
    }

    const existing = await prisma.task.findFirst({
      where: {
        id,
        location: { restaurantId: session.user.restaurantId },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: status as any,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
      include: {
        employee: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    })

    try {
      await publishEvent(
        'task.resolved',
        {
          taskId: id,
          status,
          resolvedBy: session.user.name,
          locationId: existing.locationId,
        },
        existing.locationId
      )
    } catch {}

    return NextResponse.json({ task: updated })
  } catch (error: unknown) {
    console.error('[PATCH /api/tasks/[id]]', error)
    return NextResponse.json({ error: error?.message || 'Failed to update task' }, { status: 500 })
  }
}
