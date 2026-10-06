import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  getAuthContext,
  canChangeUserRole,
  canAssignLocations,
  OrganizationRole,
} from '@/lib/auth/permissions'
import { publishEvent } from '@/lib/redis'

// ─── PATCH /api/staff/:membershipId ──────────────────────────────────────────
// Updates staff role and/or location assignments under strict authorization rules.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { membershipId } = await params
    const authCtx = await getAuthContext(session.user)
    if (!authCtx) {
      return NextResponse.json({ error: 'Forbidden: No organization membership' }, { status: 403 })
    }

    const target = await prisma.organizationMembership.findUnique({
      where: { id: membershipId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        locationAssignments: { select: { locationId: true } },
      },
    })

    if (!target || target.organizationId !== authCtx.organizationId) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const body = await req.json()
    const newRole = body.role as OrganizationRole | undefined
    const newLocationIds = body.locationIds as string[] | undefined

    const currentTargetLocationIds = target.locationAssignments.map((a) => a.locationId)

    // ── 1. Role Change Validation ──────────────────────────────────────────────
    if (newRole && newRole !== target.role) {
      if (!['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
      }

      // Check: cannot demote the last active owner
      if (target.role === 'OWNER' && newRole !== 'OWNER') {
        const activeOwnersCount = await prisma.organizationMembership.count({
          where: {
            organizationId: authCtx.organizationId,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        })
        if (activeOwnersCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot demote the last active Owner of the organization. Transfer ownership or promote another Owner first.' },
            { status: 400 }
          )
        }
      }

      const canChange = canChangeUserRole(
        authCtx,
        {
          userId: target.userId,
          role: target.role,
          locationIds: currentTargetLocationIds,
        },
        newRole
      )

      if (!canChange) {
        if (authCtx.role === 'MANAGER') {
          return NextResponse.json(
            { error: 'Forbidden: Managers can only toggle roles between Server and Kitchen for staff in their assigned locations.' },
            { status: 403 }
          )
        }
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to change this staff member role.' },
          { status: 403 }
        )
      }
    }

    // ── 2. Location Assignment Validation ──────────────────────────────────────
    if (newLocationIds !== undefined) {
      if (!Array.isArray(newLocationIds)) {
        return NextResponse.json({ error: 'locationIds must be an array' }, { status: 400 })
      }

      const canAssign = canAssignLocations(
        authCtx,
        {
          userId: target.userId,
          role: target.role,
        },
        newLocationIds
      )

      if (!canAssign) {
        if (authCtx.role === 'MANAGER') {
          return NextResponse.json(
            { error: 'Forbidden: Managers can only assign locations that they themselves are assigned to.' },
            { status: 403 }
          )
        }
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to assign these locations.' },
          { status: 403 }
        )
      }

      // Verify all locationIds actually belong to this organization
      if (newLocationIds.length > 0) {
        const validOrgLocations = await prisma.location.findMany({
          where: {
            id: { in: newLocationIds },
            restaurantId: authCtx.organizationId,
          },
          select: { id: true },
        })

        if (validOrgLocations.length !== newLocationIds.length) {
          return NextResponse.json(
            { error: 'One or more specified locationIds do not exist in this organization' },
            { status: 400 }
          )
        }
      }
    }

    // ── 3. Atomic Mutation Execution ───────────────────────────────────────────
    const updatedMembership = await prisma.$transaction(async (tx) => {
      // Role update
      if (newRole && newRole !== target.role) {
        await tx.organizationMembership.update({
          where: { id: membershipId },
          data: { role: newRole },
        })

        // Also synchronize legacy User.role so existing legacy checks stay consistent
        await tx.user.update({
          where: { id: target.userId },
          data: { role: newRole as any },
        })
      }

      // Location assignments update
      if (newLocationIds !== undefined) {
        // Remove existing
        await tx.locationAssignment.deleteMany({
          where: { membershipId },
        })

        // Insert new
        for (const locId of newLocationIds) {
          await tx.locationAssignment.create({
            data: {
              membershipId,
              locationId: locId,
            },
          })
        }
      }

      // Audit log entry
      await tx.auditLog.create({
        data: {
          organizationId: authCtx.organizationId,
          restaurantId: authCtx.organizationId,
          actorId: authCtx.userId,
          actorName: authCtx.name || 'Admin',
          targetUserId: target.userId,
          targetType: 'OrganizationMembership',
          targetId: target.id,
          action: 'STAFF_UPDATED',
          before: {
            role: target.role,
            locationIds: currentTargetLocationIds,
          },
          after: {
            role: newRole || target.role,
            locationIds: newLocationIds ?? currentTargetLocationIds,
          },
        },
      })

      return tx.organizationMembership.findUnique({
        where: { id: membershipId },
        include: {
          user: { select: { id: true, name: true, email: true, isActive: true } },
          locationAssignments: {
            include: {
              location: { select: { id: true, name: true, isHeadquarters: true } },
            },
          },
        },
      })
    })

    // Broadcast live event
    try {
      await publishEvent('staff.updated', {
        membershipId,
        userId: target.userId,
        role: newRole || target.role,
      })
    } catch {}

    return NextResponse.json({
      success: true,
      membership: {
        id: updatedMembership!.id,
        userId: updatedMembership!.userId,
        role: updatedMembership!.role,
        status: updatedMembership!.status,
        user: updatedMembership!.user,
        locations: updatedMembership!.locationAssignments.map((a) => a.location),
      },
    })
  } catch (error: any) {
    console.error('[PATCH /api/staff/:membershipId]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
