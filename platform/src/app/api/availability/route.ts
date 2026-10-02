import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  type: z.enum(['AVAILABLE', 'UNAVAILABLE', 'PREFERRED']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  specificDate: z.string().datetime().nullable().optional(),
  isRecurring: z.boolean().default(true),
  notes: z.string().max(300).nullable().optional(),
})
const saveSchema = z.object({ employeeId: z.string().optional(), slots: z.array(slotSchema).max(40) })

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const mine = await prisma.employee.findFirst({ where: { userId: session.user.id, isActive: true } })
  const requested = new URL(req.url).searchParams.get('employeeId')
  const isManager = ['OWNER', 'MANAGER'].includes(session.user.role)
  const employeeId = requested && isManager ? requested : mine?.id
  if (!employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, location: { restaurantId: session.user.restaurantId } },
    include: { availability: { orderBy: [{ specificDate: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }] } },
  })
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  return NextResponse.json(employee.availability)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = saveSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const mine = await prisma.employee.findFirst({ where: { userId: session.user.id, isActive: true } })
  const isManager = ['OWNER', 'MANAGER'].includes(session.user.role)
  const employeeId = parsed.data.employeeId && isManager ? parsed.data.employeeId : mine?.id
  if (!employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  const target = await prisma.employee.findFirst({ where: { id: employeeId, location: { restaurantId: session.user.restaurantId } } })
  if (!target) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  for (const slot of parsed.data.slots) {
    if (slot.startTime && slot.endTime && slot.startTime >= slot.endTime) {
      return NextResponse.json({ error: 'Availability end time must be after start time' }, { status: 400 })
    }
  }
  const saved = await prisma.$transaction(async tx => {
    await tx.workerAvailability.deleteMany({ where: { employeeId } })
    if (parsed.data.slots.length) await tx.workerAvailability.createMany({
      data: parsed.data.slots.map(slot => ({
        employeeId, dayOfWeek: slot.dayOfWeek, type: slot.type,
        startTime: slot.startTime ?? null, endTime: slot.endTime ?? null,
        specificDate: slot.specificDate ? new Date(slot.specificDate) : null,
        isRecurring: slot.isRecurring, notes: slot.notes ?? null,
      })),
    })
    return tx.workerAvailability.findMany({ where: { employeeId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] })
  })
  return NextResponse.json(saved)
}
