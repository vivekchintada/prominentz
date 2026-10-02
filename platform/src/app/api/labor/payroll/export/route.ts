import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'

export const dynamic = 'force-dynamic'

function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields
    .map((val) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    })
    .join(',')
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const location = await resolveLocationContext(session.user.id, session.user.restaurantId)
  if (!location) return NextResponse.json({ error: 'No active location found' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  
  // Default to past 14 days
  const defaultStart = new Date(now)
  defaultStart.setDate(defaultStart.getDate() - 14)
  defaultStart.setHours(0, 0, 0, 0)

  const startDateStr = searchParams.get('startDate') || defaultStart.toISOString()
  const endDateStr = searchParams.get('endDate') || now.toISOString()

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  // Fetch overtime rules
  const overtimeRule = await prisma.overtimeRule.findUnique({
    where: { locationId: location.id },
  })

  const dailyThreshold = overtimeRule?.dailyThresholdHours ?? 8.0
  const weeklyThreshold = overtimeRule?.weeklyThresholdHours ?? 40.0
  const otMultiplier = overtimeRule?.overtimeMultiplier ?? 1.5

  // Fetch approved time entries in range
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      locationId: location.id,
      clockIn: { gte: startDate, lte: endDate },
      clockOut: { not: null },
    },
    include: {
      employee: {
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
      },
    },
    orderBy: { clockIn: 'asc' },
  })

  // Group by employee
  interface EmployeePayroll {
    id: string
    name: string
    role: string
    employmentType: string
    hourlyRate: number
    dayHours: Record<string, number>
    totalApprovedEntries: number
  }

  const employeeMap = new Map<string, EmployeePayroll>()

  for (const entry of timeEntries) {
    if (!entry.clockOut) continue
    const empId = entry.employeeId
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        id: empId,
        name: entry.employee.user.name || 'Unnamed Staff',
        role: entry.employee.user.role,
        employmentType: entry.employee.employmentType,
        hourlyRate: Number(entry.employee.hourlyRate || 15.0),
        dayHours: {},
        totalApprovedEntries: 0,
      })
    }

    const rec = employeeMap.get(empId)!
    rec.totalApprovedEntries += 1

    const hoursWorked = Math.max(
      0,
      (entry.clockOut.getTime() - entry.clockIn.getTime()) / (1000 * 60 * 60) - (entry.breakMinutes || 0) / 60
    )

    const dayKey = entry.clockIn.toISOString().slice(0, 10)
    rec.dayHours[dayKey] = (rec.dayHours[dayKey] || 0) + hoursWorked
  }

  const headers = [
    'Employee ID',
    'Employee Name',
    'Role',
    'Employment Type',
    'Period Start',
    'Period End',
    'Total Entries',
    'Regular Hours',
    'Daily Overtime Hours',
    'Total Overtime Hours',
    'Total Paid Hours',
    'Hourly Rate ($)',
    'Overtime Rate ($)',
    'Regular Pay ($)',
    'Overtime Pay ($)',
    'Gross Pay ($)',
  ]

  const rows: string[] = []

  for (const emp of employeeMap.values()) {
    let empRegularHours = 0
    let empDailyOvertime = 0

    // Compute daily hours & daily overtime
    for (const dHours of Object.values(emp.dayHours)) {
      if (dHours > dailyThreshold) {
        empRegularHours += dailyThreshold
        empDailyOvertime += (dHours - dailyThreshold)
      } else {
        empRegularHours += dHours
      }
    }

    // Compute weekly overtime if regular exceeds weekly threshold
    let totalOvertimeHours = empDailyOvertime
    if (empRegularHours > weeklyThreshold) {
      const weeklyExcess = empRegularHours - weeklyThreshold
      empRegularHours = weeklyThreshold
      totalOvertimeHours += weeklyExcess
    }

    const totalHours = empRegularHours + totalOvertimeHours
    const otRate = emp.hourlyRate * otMultiplier
    const regularPay = empRegularHours * emp.hourlyRate
    const overtimePay = totalOvertimeHours * otRate
    const grossPay = regularPay + overtimePay

    rows.push(
      toCsvRow([
        emp.id,
        emp.name,
        emp.role,
        emp.employmentType,
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10),
        emp.totalApprovedEntries,
        empRegularHours.toFixed(2),
        empDailyOvertime.toFixed(2),
        totalOvertimeHours.toFixed(2),
        totalHours.toFixed(2),
        emp.hourlyRate.toFixed(2),
        otRate.toFixed(2),
        regularPay.toFixed(2),
        overtimePay.toFixed(2),
        grossPay.toFixed(2),
      ])
    )
  }

  const csvContent = [headers.join(','), ...rows].join('\n')
  const filename = `payroll-${startDate.toISOString().slice(0, 10)}_to_${endDate.toISOString().slice(0, 10)}.csv`

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
