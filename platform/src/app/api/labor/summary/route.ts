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
  const [shifts, entries, payments] = await Promise.all([
    prisma.shift.findMany({ where: { locationId, scheduledStart: { gte: start }, scheduledEnd: { lte: end }, status: { not: 'CANCELLED' } }, include: { employee: { include: { user: { select: { name: true } } } } } }),
    prisma.timeEntry.findMany({ where: { locationId, clockIn: { gte: start, lte: end } }, include: { employee: { include: { user: { select: { name: true } } } } } }),
    prisma.payment.findMany({ where: { status: 'COMPLETED', createdAt: { gte: start, lte: end }, order: { table: { locationId } } }, select: { total: true } }),
  ])
  const plannedMinutes = shifts.reduce((n, s) => n + (s.scheduledStart && s.scheduledEnd ? Math.max(0, (s.scheduledEnd.getTime() - s.scheduledStart.getTime()) / 60000 - s.breakMinutes) : 0), 0)
  const plannedCost = shifts.reduce((n, s) => { const m = s.scheduledStart && s.scheduledEnd ? Math.max(0, (s.scheduledEnd.getTime() - s.scheduledStart.getTime()) / 60000 - s.breakMinutes) : 0; return n + m / 60 * Number(s.hourlyRateSnapshot ?? s.employee.hourlyRate ?? 0) }, 0)
  const actualMinutes = entries.reduce((n, e) => n + (e.clockOut ? Math.max(0, (e.clockOut.getTime() - e.clockIn.getTime()) / 60000 - e.breakMinutes) : 0), 0)
  const actualCost = entries.reduce((n, e) => { const m = e.clockOut ? Math.max(0, (e.clockOut.getTime() - e.clockIn.getTime()) / 60000 - e.breakMinutes) : 0; return n + m / 60 * Number(e.employee.hourlyRate ?? 0) }, 0)
  const sales = payments.reduce((n, p) => n + Number(p.total), 0)
  const byEmployee = new Map<string, { employeeId: string; name: string; plannedMinutes: number; actualMinutes: number; cost: number }>()
  for (const s of shifts) { const row = byEmployee.get(s.employeeId) ?? { employeeId: s.employeeId, name: s.employee.user.name ?? 'Staff member', plannedMinutes: 0, actualMinutes: 0, cost: 0 }; const m = s.scheduledStart && s.scheduledEnd ? Math.max(0, (s.scheduledEnd.getTime() - s.scheduledStart.getTime()) / 60000 - s.breakMinutes) : 0; row.plannedMinutes += m; byEmployee.set(s.employeeId, row) }
  for (const e of entries) { const row = byEmployee.get(e.employeeId) ?? { employeeId: e.employeeId, name: e.employee.user.name ?? 'Staff member', plannedMinutes: 0, actualMinutes: 0, cost: 0 }; const m = e.clockOut ? Math.max(0, (e.clockOut.getTime() - e.clockIn.getTime()) / 60000 - e.breakMinutes) : 0; row.actualMinutes += m; row.cost += m / 60 * Number(e.employee.hourlyRate ?? 0); byEmployee.set(e.employeeId, row) }
  return NextResponse.json({ range: { start, end }, plannedHours: plannedMinutes / 60, actualHours: actualMinutes / 60, plannedCost, actualCost, sales, laborPercent: sales ? actualCost / sales * 100 : 0, salesPerLaborHour: actualMinutes ? sales / (actualMinutes / 60) : 0, overtimeHours: [...byEmployee.values()].reduce((n, r) => n + Math.max(0, r.actualMinutes / 60 - 40), 0), byEmployee: [...byEmployee.values()] })
}
