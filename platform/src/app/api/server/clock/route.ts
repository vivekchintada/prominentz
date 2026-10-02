import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'
import { isWithinGeofence } from '@/lib/geo'

export const dynamic = 'force-dynamic'

// ─── GET /api/server/clock ───────────────────────────────────────────────────
// Returns current staff user's clock-in status and active shift/time entry details
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            lat: true,
            lng: true,
            geofenceRadiusM: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({
        isClockedIn: false,
        shift: null,
        timeEntry: null,
        employee: null,
        message: 'No active employee profile associated with user account',
      })
    }

    // Check active TimeEntry first, fallback to active Shift
    const activeTimeEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.id,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
      include: { shift: true },
    })

    const activeShift = activeTimeEntry?.shift || await prisma.shift.findFirst({
      where: {
        employeeId: employee.id,
        status: 'ACTIVE',
      },
      orderBy: { clockIn: 'desc' },
    })

    const clockInTime = activeTimeEntry?.clockIn || activeShift?.clockIn
    const elapsedMinutes = clockInTime
      ? Math.max(0, Math.round((Date.now() - new Date(clockInTime).getTime()) / 60000))
      : 0

    return NextResponse.json({
      isClockedIn: !!(activeTimeEntry || activeShift),
      employee: {
        id: employee.id,
        name: session.user.name,
        role: session.user.role,
        jobTitle: employee.jobTitle,
        locationId: employee.location?.id,
        locationName: employee.location?.name ?? 'Main Location',
        locationCoords: {
          lat: employee.location?.lat,
          lng: employee.location?.lng,
          radiusMeters: employee.location?.geofenceRadiusM ?? 150,
        },
      },
      shift: activeShift
        ? {
            id: activeShift.id,
            clockIn: activeShift.clockIn,
            elapsedMinutes,
            role: activeShift.role,
          }
        : null,
      timeEntry: activeTimeEntry
        ? {
            id: activeTimeEntry.id,
            clockIn: activeTimeEntry.clockIn,
            status: activeTimeEntry.status,
            flagReason: activeTimeEntry.flagReason,
            distanceMeters: activeTimeEntry.distanceMeters,
            elapsedMinutes,
          }
        : null,
    })
  } catch (error: any) {
    console.error('[GET /api/server/clock]', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch clock status' }, { status: 500 })
  }
}

// ─── POST /api/server/clock ──────────────────────────────────────────────────
// Clocks in or out the current staff user with Geofence verification
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action as 'CLOCK_IN' | 'CLOCK_OUT' | undefined
    const lat = typeof body.lat === 'number' ? body.lat : null
    const lng = typeof body.lng === 'number' ? body.lng : null

    let employee = await prisma.employee.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: {
        location: true,
      },
    })

    // If no employee record exists yet for this user, auto-create one at primary location
    if (!employee) {
      const primaryLoc = await prisma.location.findFirst({
        where: { restaurantId: session.user.restaurantId },
      })
      if (primaryLoc) {
        employee = await prisma.employee.create({
          data: {
            userId: session.user.id,
            locationId: primaryLoc.id,
            jobTitle: session.user.role === 'SERVER' ? 'Floor Server' : 'Staff Member',
            isActive: true,
          },
          include: { location: true },
        })
      }
    }

    if (!employee) {
      return NextResponse.json({ error: 'Failed to resolve employee record' }, { status: 404 })
    }

    const activeTimeEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId: employee.id,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    })

    const activeShift = await prisma.shift.findFirst({
      where: {
        employeeId: employee.id,
        status: 'ACTIVE',
      },
      orderBy: { clockIn: 'desc' },
    })

    const isClocked = !!(activeTimeEntry || activeShift)
    const targetAction = action || (isClocked ? 'CLOCK_OUT' : 'CLOCK_IN')

    if (targetAction === 'CLOCK_IN') {
      if (isClocked) {
        return NextResponse.json({
          message: 'Already clocked in',
          isClockedIn: true,
          shift: activeShift,
          timeEntry: activeTimeEntry,
        })
      }

      const now = new Date()

      // Geofence check
      const loc = employee.location
      const geoCheck = isWithinGeofence(
        lat,
        lng,
        loc?.lat,
        loc?.lng,
        loc?.geofenceRadiusM ?? 150
      )

      const isFlagged = !geoCheck.inBounds
      const flagReason = isFlagged
        ? `Out of geofence (${geoCheck.distanceMeters ?? 'unknown'}m from ${loc?.name || 'location'})`
        : null

      // Create Shift record
      const newShift = await prisma.shift.create({
        data: {
          employeeId: employee.id,
          locationId: employee.locationId,
          clockIn: now,
          status: 'ACTIVE',
          role: (session.user.role as any) || 'SERVER',
        },
      })

      // Create TimeEntry record
      const newTimeEntry = await prisma.timeEntry.create({
        data: {
          employeeId: employee.id,
          shiftId: newShift.id,
          locationId: employee.locationId,
          clockIn: now,
          clockInLat: lat,
          clockInLng: lng,
          distanceMeters: geoCheck.distanceMeters,
          status: isFlagged ? 'FLAGGED' : 'ACTIVE',
          flagReason,
        },
      })

      // Publish events
      try {
        await publishEvent(
          'employee.clocked_in',
          {
            employeeId: employee.id,
            shiftId: newShift.id,
            timeEntryId: newTimeEntry.id,
            locationId: employee.locationId,
            clockIn: newShift.clockIn,
            userName: session.user.name,
            role: session.user.role,
            isFlagged,
            flagReason,
            distanceMeters: geoCheck.distanceMeters,
          },
          employee.locationId
        )

        if (isFlagged) {
          await publishEvent(
            'attendance.flagged',
            {
              employeeId: employee.id,
              userName: session.user.name,
              reason: flagReason,
              distanceMeters: geoCheck.distanceMeters,
              locationId: employee.locationId,
            },
            employee.locationId
          )
        }
      } catch {}

      return NextResponse.json({
        success: true,
        isClockedIn: true,
        action: 'CLOCK_IN',
        shift: {
          id: newShift.id,
          clockIn: newShift.clockIn,
          elapsedMinutes: 0,
        },
        timeEntry: {
          id: newTimeEntry.id,
          clockIn: newTimeEntry.clockIn,
          status: newTimeEntry.status,
          flagReason: newTimeEntry.flagReason,
          distanceMeters: newTimeEntry.distanceMeters,
        },
        message: isFlagged
          ? `Clocked in with warning: ${flagReason}. Please confirm your location with your manager.`
          : `Successfully clocked in! Have a great shift, ${session.user.name}.`,
      })
    } else {
      // CLOCK_OUT
      const now = new Date()

      if (activeShift) {
        await prisma.shift.update({
          where: { id: activeShift.id },
          data: {
            clockOut: now,
            status: 'COMPLETED',
          },
        })
      }

      let completedTimeEntry = null
      if (activeTimeEntry) {
        completedTimeEntry = await prisma.timeEntry.update({
          where: { id: activeTimeEntry.id },
          data: {
            clockOut: now,
            status: activeTimeEntry.status === 'FLAGGED' ? 'FLAGGED' : 'COMPLETED',
          },
        })
      }

      try {
        await publishEvent(
          'employee.clocked_out',
          {
            employeeId: employee.id,
            shiftId: activeShift?.id,
            timeEntryId: activeTimeEntry?.id,
            locationId: employee.locationId,
            clockOut: now,
            userName: session.user.name,
          },
          employee.locationId
        )
      } catch {}

      const clockInTime = activeTimeEntry?.clockIn || activeShift?.clockIn
      const totalMinutes = clockInTime
        ? Math.round((now.getTime() - new Date(clockInTime).getTime()) / 60000)
        : 0

      return NextResponse.json({
        success: true,
        isClockedIn: false,
        action: 'CLOCK_OUT',
        shift: null,
        timeEntry: null,
        totalMinutes,
        message: `Clocked out successfully. Shift duration: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m.`,
      })
    }
  } catch (error: any) {
    console.error('[POST /api/server/clock]', error)
    return NextResponse.json({ error: error?.message || 'Failed to update clock status' }, { status: 500 })
  }
}
