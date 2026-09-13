import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateShiftSchema = z.object({
  role:           z.enum(['OWNER', 'MANAGER', 'SERVER', 'KITCHEN']).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd:   z.string().datetime().optional(),
  status:         z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
})

// ─── PATCH /api/shifts/[id] ───────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = updateShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify shift belongs to this restaurant
    const existing = await prisma.shift.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.role)   updateData.role   = parsed.data.role
    if (parsed.data.status) updateData.status = parsed.data.status

    const newStart = parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : existing.scheduledStart
    const newEnd   = parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : existing.scheduledEnd

    if (parsed.data.scheduledStart || parsed.data.scheduledEnd) {
      if (newStart && newEnd && newEnd <= newStart) {
        return NextResponse.json({ error: 'Shift end time must be after start time' }, { status: 400 })
      }

      if (newStart && newEnd) {
        const overlap = await prisma.shift.findFirst({
          where: {
            id: { not: id },
            employeeId: existing.employeeId,
            status: { in: ['SCHEDULED', 'ACTIVE'] },
            scheduledStart: { lt: newEnd },
            scheduledEnd:   { gt: newStart },
          },
        })
        if (overlap) {
          return NextResponse.json(
            { error: 'Employee already has an active or scheduled shift overlapping with this time period.' },
            { status: 409 }
          )
        }
      }
      if (parsed.data.scheduledStart) updateData.scheduledStart = newStart
      if (parsed.data.scheduledEnd)   updateData.scheduledEnd   = newEnd
    }

    const updated = await prisma.shift.update({ where: { id }, data: updateData })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/shifts/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/shifts/[id] ─────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.shift.findFirst({
      where: { id, location: { restaurantId: session.user.restaurantId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Only allow deleting SCHEDULED shifts (not active/completed)
    if (!['SCHEDULED', 'CANCELLED'].includes(existing.status)) {
      return NextResponse.json({ error: 'Cannot delete an active or completed shift' }, { status: 409 })
    }

    await prisma.shiftNote.deleteMany({ where: { shiftId: id } })
    await prisma.shift.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/shifts/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
