import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  employeeId: z.string().optional(),
  isOpen: z.boolean().optional(),
  role: z.enum(['OWNER', 'MANAGER', 'SERVER', 'KITCHEN']).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  breakMinutes: z.number().int().min(0).max(240).optional(),
  station: z.string().max(80).nullable().optional(),
})

async function ownedShift(id: string, restaurantId: string) {
  return prisma.shift.findFirst({ where: { id, location: { restaurantId } }, include: { employee: true } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const shift = await ownedShift(id, session.user.restaurantId)
  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  const start = parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : shift.scheduledStart
  const end = parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : shift.scheduledEnd
  if (!start || !end || end <= start) return NextResponse.json({ error: 'Shift end must be after start' }, { status: 400 })

  const targetEmployeeId = parsed.data.employeeId !== undefined ? parsed.data.employeeId : shift.employeeId
  if (targetEmployeeId) {
    const overlap = await prisma.shift.findFirst({
      where: {
        id: { not: id },
        employeeId: targetEmployeeId,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        scheduledStart: { lt: end },
        scheduledEnd: { gt: start },
      },
    })
    if (overlap) return NextResponse.json({ error: 'This employee already has an overlapping shift' }, { status: 409 })
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      ...parsed.data,
      scheduledStart: start,
      scheduledEnd: end,
      employeeId: targetEmployeeId,
      publishedAt: null,
      publishedBy: null,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const shift = await ownedShift(id, session.user.restaurantId)
  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  if (shift.status === 'ACTIVE' || shift.status === 'COMPLETED') return NextResponse.json({ error: 'Active or completed shifts cannot be deleted' }, { status: 409 })
  await prisma.shift.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
