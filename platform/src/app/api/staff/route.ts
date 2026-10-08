import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth/permissions'

// ─── GET /api/staff ───────────────────────────────────────────────────────────
// List organization members according to the requester's role and location scope.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authCtx = await getAuthContext(session.user)
    if (!authCtx) {
      return NextResponse.json({ error: 'Forbidden: No organization membership found' }, { status: 403 })
    }

    if (authCtx.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Forbidden: Your organization access is currently suspended' }, { status: 403 })
    }

    // Role check: Only Owner and Manager can view staff directory
    if (authCtx.role !== 'OWNER' && authCtx.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view staff directory' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const roleFilter = searchParams.get('role')
    const statusFilter = searchParams.get('status')
    const locationFilter = searchParams.get('locationId')
    const search = searchParams.get('search')?.toLowerCase().trim()

    // Query all memberships for this organization
    const rawMemberships = await prisma.organizationMembership.findMany({
      where: {
        organizationId: authCtx.organizationId,
        ...(roleFilter ? { role: roleFilter as any } : {}),
        ...(statusFilter ? { status: statusFilter as any } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
        locationAssignments: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                isHeadquarters: true,
              },
            },
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Scope for Manager:
    // Managers can only see staff belonging to locations they manage
    const visibleMemberships = rawMemberships.filter((m) => {
      const memberLocationIds = m.locationAssignments.map((a) => a.locationId)

      // If actor is OWNER, can see all
      if (authCtx.role === 'OWNER') {
        if (locationFilter) {
          return memberLocationIds.includes(locationFilter)
        }
        return true
      }

      // If actor is MANAGER:
      // Can see themselves, or staff who share at least one location assigned to this manager
      const sharesLocation = memberLocationIds.some((id) => authCtx.locationIds.includes(id))
      const isSelf = m.userId === authCtx.userId

      if (!sharesLocation && !isSelf) {
        return false
      }

      if (locationFilter) {
        return memberLocationIds.includes(locationFilter)
      }

      return true
    })

    // Optional text search by name or email
    const filtered = visibleMemberships.filter((m) => {
      if (!search) return true
      const nameMatch = m.user?.name?.toLowerCase().includes(search)
      const emailMatch = m.user?.email?.toLowerCase().includes(search)
      return nameMatch || emailMatch
    })

    // Available locations for assignment by this actor
    const availableLocations = await prisma.location.findMany({
      where: {
        restaurantId: authCtx.organizationId,
        ...(authCtx.role === 'MANAGER' ? { id: { in: authCtx.locationIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        isHeadquarters: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      members: filtered.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        status: m.status,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        user: m.user,
        locations: m.locationAssignments.map((a) => a.location),
      })),
      actor: {
        userId: authCtx.userId,
        role: authCtx.role,
        locationIds: authCtx.locationIds,
      },
      availableLocations,
    })
  } catch (error: unknown) {
    console.error('[GET /api/staff]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
