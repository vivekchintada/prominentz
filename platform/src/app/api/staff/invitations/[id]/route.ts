import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/auth/permissions'

// ─── DELETE /api/staff/invitations/:id ────────────────────────────────────────
// Revokes a pending staff invitation.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const authCtx = await getAuthContext(session.user)
    if (!authCtx) {
      return NextResponse.json({ error: 'Forbidden: No organization membership' }, { status: 403 })
    }

    const invitation = await prisma.staffInvitation.findUnique({
      where: { id },
    })

    if (!invitation || invitation.organizationId !== authCtx.organizationId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    if (invitation.revokedAt) {
      return NextResponse.json({ error: 'Invitation is already revoked' }, { status: 400 })
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ error: 'Invitation was already accepted' }, { status: 400 })
    }

    // Permission check:
    // Owner can revoke any invitation.
    // Manager can only revoke Server / Kitchen invitations for their assigned locations.
    if (authCtx.role !== 'OWNER') {
      if (invitation.role === 'OWNER' || invitation.role === 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden: Managers cannot revoke Manager invitations' }, { status: 403 })
      }
      if (invitation.locationId && !authCtx.locationIds.includes(invitation.locationId)) {
        return NextResponse.json({ error: 'Forbidden: Cannot revoke invitations for unassigned locations' }, { status: 403 })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.staffInvitation.update({
        where: { id },
        data: { revokedAt: new Date() },
      })

      await tx.auditLog.create({
        data: {
          organizationId: authCtx.organizationId,
          restaurantId: authCtx.organizationId,
          locationId: invitation.locationId,
          actorId: authCtx.userId,
          actorName: authCtx.name || 'Manager',
          targetType: 'StaffInvitation',
          targetId: invitation.id,
          action: 'STAFF_INVITATION_REVOKED',
          metadata: {
            email: invitation.email,
            role: invitation.role,
          },
        },
      })
    })

    return NextResponse.json({ success: true, message: 'Invitation revoked successfully' })
  } catch (error: unknown) {
    console.error('[DELETE /api/staff/invitations/:id]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
