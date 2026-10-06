import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAuthContext, canDeactivateUser } from '@/lib/auth/permissions'
import { publishEvent } from '@/lib/redis'

// ─── POST /api/staff/:membershipId/reactivate ─────────────────────────────────
// Reactivates a suspended staff member under role and location boundary checks.
export async function POST(
  _req: NextRequest,
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

    if (target.status === 'ACTIVE') {
      return NextResponse.json({ error: 'Staff member is already active' }, { status: 400 })
    }

    const targetLocationIds = target.locationAssignments.map((a) => a.locationId)
    const allowed = canDeactivateUser(authCtx, {
      userId: target.userId,
      role: target.role,
      locationIds: targetLocationIds,
    })

    if (!allowed) {
      if (authCtx.role === 'MANAGER') {
        return NextResponse.json(
          { error: 'Forbidden: Managers can only reactivate Server or Kitchen staff assigned to their managed locations.' },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to reactivate this user.' }, { status: 403 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update membership status to ACTIVE
      await tx.organizationMembership.update({
        where: { id: membershipId },
        data: { status: 'ACTIVE' },
      })

      // 2. Reactivate User record
      await tx.user.update({
        where: { id: target.userId },
        data: { isActive: true },
      })

      // 3. Write audit log
      await tx.auditLog.create({
        data: {
          organizationId: authCtx.organizationId,
          restaurantId: authCtx.organizationId,
          actorId: authCtx.userId,
          actorName: authCtx.name || 'Admin',
          targetUserId: target.userId,
          targetType: 'OrganizationMembership',
          targetId: target.id,
          action: 'STAFF_REACTIVATED',
          metadata: {
            reactivatedEmail: target.user.email,
            role: target.role,
          },
        },
      })
    })

    try {
      await publishEvent('staff.reactivated', {
        membershipId,
        userId: target.userId,
      })
    } catch {}

    return NextResponse.json({ success: true, message: `Staff member ${target.user.name} has been reactivated.` })
  } catch (error: any) {
    console.error('[POST /api/staff/:membershipId/reactivate]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
