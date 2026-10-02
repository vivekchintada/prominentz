import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  approved: z.boolean().optional(),
  managerNote: z.string().max(500).nullable().optional(),
  managerReason: z.string().max(500).optional(),
  breakMinutes: z.number().int().min(0).max(480).optional(),
  clockIn: z.string().datetime().optional(),
  clockOut: z.string().datetime().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id } = await params
  const entry = await prisma.timeEntry.findFirst({
    where: { id, location: { restaurantId: session.user.restaurantId } },
  })
  if (!entry) return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })

  const isTimeAdjustment =
    (parsed.data.clockIn !== undefined && new Date(parsed.data.clockIn).getTime() !== entry.clockIn.getTime()) ||
    (parsed.data.clockOut !== undefined &&
      ((parsed.data.clockOut === null && entry.clockOut !== null) ||
        (parsed.data.clockOut !== null && (!entry.clockOut || new Date(parsed.data.clockOut).getTime() !== entry.clockOut.getTime())))) ||
    (parsed.data.breakMinutes !== undefined && parsed.data.breakMinutes !== entry.breakMinutes)

  const reason = parsed.data.managerReason || parsed.data.managerNote
  if (isTimeAdjustment && (!reason || !reason.trim())) {
    return NextResponse.json(
      { error: 'A mandatory manager reason is required when adjusting timesheet hours or breaks.' },
      { status: 400 }
    )
  }

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: {
      approvedAt: parsed.data.approved !== undefined ? (parsed.data.approved ? new Date() : null) : undefined,
      approvedBy: parsed.data.approved !== undefined ? (parsed.data.approved ? session.user.id : null) : undefined,
      managerNote: reason ?? undefined,
      breakMinutes: parsed.data.breakMinutes,
      clockIn: parsed.data.clockIn ? new Date(parsed.data.clockIn) : undefined,
      clockOut: parsed.data.clockOut === null ? null : parsed.data.clockOut ? new Date(parsed.data.clockOut) : undefined,
    },
  })

  if (isTimeAdjustment) {
    await prisma.auditLog.create({
      data: {
        restaurantId: session.user.restaurantId,
        action: 'TIMESHEET_MODIFIED',
        targetType: 'TimeEntry',
        targetId: id,
        actorId: session.user.id,
        actorName: session.user.name || 'Manager',
        before: {
          clockIn: entry.clockIn.toISOString(),
          clockOut: entry.clockOut?.toISOString() ?? null,
          breakMinutes: entry.breakMinutes,
        },
        after: {
          clockIn: updated.clockIn.toISOString(),
          clockOut: updated.clockOut?.toISOString() ?? null,
          breakMinutes: updated.breakMinutes,
          reason,
        },
      },
    }).catch(() => {})
  }

  return NextResponse.json(updated)
}
