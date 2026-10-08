import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/employees/clocked-in ───────────────────────────────────────────
// Returns all staff members currently clocked in across the restaurant/location
// including geofence anomaly flags and distance telemetry.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ clockedIn: [], count: 0 })
    }

    // Find all ACTIVE shifts or un-clocked-out TimeEntries for this restaurant
    const activeShifts = await prisma.shift.findMany({
      where: {
        status: 'ACTIVE',
        employee: {
          location: {
            restaurantId,
          },
        },
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
                lat: true,
                lng: true,
                geofenceRadiusM: true,
              },
            },
            timeEntries: {
              where: { clockOut: null },
              orderBy: { clockIn: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { clockIn: 'desc' },
    })

    const now = Date.now()

    const clockedInStaff = activeShifts.map((shift) => {
      const activeEntry = shift.employee.timeEntries[0]
      const clockInDate = activeEntry?.clockIn
        ? new Date(activeEntry.clockIn)
        : shift.clockIn
        ? new Date(shift.clockIn)
        : new Date()

      const elapsedMins = Math.max(0, Math.round((now - clockInDate.getTime()) / 60000))
      const hours = Math.floor(elapsedMins / 60)
      const mins = elapsedMins % 60
      const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

      const isFlagged = activeEntry?.status === 'FLAGGED'
      const flagReason = activeEntry?.flagReason || null
      const distanceMeters = activeEntry?.distanceMeters ?? null

      return {
        shiftId: shift.id,
        timeEntryId: activeEntry?.id || null,
        employeeId: shift.employeeId,
        userId: shift.employee.user?.id || '',
        name: shift.employee.user?.name || 'Staff Member',
        email: shift.employee.user?.email || '',
        role: shift.role || shift.employee.user?.role || 'SERVER',
        jobTitle: shift.employee.jobTitle || 'Floor Staff',
        locationName: shift.employee.location?.name || 'Main Location',
        clockInTime: clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clockInIso: clockInDate.toISOString(),
        elapsedMinutes: elapsedMins,
        durationFormatted,
        hourlyRate: shift.employee.hourlyRate ? Number(shift.employee.hourlyRate) : 15.0,
        isFlagged,
        flagReason,
        distanceMeters,
      }
    })

    return NextResponse.json({
      count: clockedInStaff.length,
      flaggedCount: clockedInStaff.filter((s) => s.isFlagged).length,
      staff: clockedInStaff,
    })
  } catch (error: unknown) {
    console.error('[GET /api/employees/clocked-in]', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch clocked-in staff' }, { status: 500 })
  }
}
