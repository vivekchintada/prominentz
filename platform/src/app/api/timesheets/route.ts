import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveActiveLocation } from '@/lib/location-context'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { locationId } = await resolveActiveLocation(session.user.id, session.user.restaurantId)
  if (!locationId) return NextResponse.json({ error: 'Location not resolved' }, { status: 404 })
  const q = new URL(req.url).searchParams
  const start = q.get('startDate') ? new Date(q.get('startDate')!) : new Date(Date.now() - 7 * 86400000)
  const end = q.get('endDate') ? new Date(q.get('endDate')!) : new Date()
  const entries = await prisma.timeEntry.findMany({ where: { locationId, clockIn: { gte: start, lte: end } }, include: { employee: { include: { user: { select: { name: true, email: true } } } }, shift: true }, orderBy: { clockIn: 'desc' } })
  return NextResponse.json(entries.map(e => ({ ...e, workedMinutes: e.clockOut ? Math.max(0, Math.round((e.clockOut.getTime() - e.clockIn.getTime()) / 60000) - e.breakMinutes) : null, hourlyRate: Number(e.employee.hourlyRate ?? 0) })))
}
