import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAuthContext, canInviteUser, OrganizationRole } from '@/lib/auth/permissions'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendStaffInvitationEmail } from '@/lib/staff-invitation-email'

// ─── GET /api/staff/invitations ───────────────────────────────────────────────
// Lists active pending invitations for the requester's organization.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authCtx = await getAuthContext(session.user)
    if (!authCtx) {
      return NextResponse.json({ error: 'Forbidden: No organization membership' }, { status: 403 })
    }

    if (authCtx.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Forbidden: Your organization access is currently suspended' }, { status: 403 })
    }

    if (authCtx.role !== 'OWNER' && authCtx.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    const invitations = await prisma.staffInvitation.findMany({
      where: {
        organizationId: authCtx.organizationId,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        ...(authCtx.role === 'MANAGER'
          ? {
              OR: [
                { locationId: { in: authCtx.locationIds } },
                { invitedById: authCtx.userId },
              ],
            }
          : {}),
      },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        locationId: inv.locationId,
        locationName: inv.location?.name || 'All Locations',
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }))
    )
  } catch (error: unknown) {
    console.error('[GET /api/staff/invitations]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/staff/invitations ──────────────────────────────────────────────
// Generates a cryptographically secure, expiring staff invitation.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate-limit: 30 invitations per 10 minutes per user
    const rl = await rateLimit(`invitations:${session.user.id}`, 30, 600)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec)

    const authCtx = await getAuthContext(session.user)
    if (!authCtx) {
      return NextResponse.json({ error: 'Forbidden: No organization membership' }, { status: 403 })
    }

    const body = await req.json()
    const email = body.email?.toLowerCase().trim()
    const role = body.role as OrganizationRole
    const locationId = body.locationId || null

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    if (!['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
    }

    // ── Enforce Capability Matrix ──────────────────────────────────────────────
    const allowed = canInviteUser(authCtx, role, locationId)
    if (!allowed) {
      if (authCtx.role === 'MANAGER' && role === 'MANAGER') {
        return NextResponse.json(
          { error: 'Managers are not authorized to invite other Managers. Only Owners can onboard Managers.' },
          { status: 403 }
        )
      }
      if (authCtx.role === 'MANAGER' && !locationId) {
        return NextResponse.json(
          { error: 'Managers must specify an assigned location when inviting staff.' },
          { status: 403 }
        )
      }
      if (authCtx.role === 'MANAGER' && locationId && !authCtx.locationIds.includes(locationId)) {
        return NextResponse.json(
          { error: 'Managers cannot invite staff to locations they are not assigned to.' },
          { status: 403 }
        )
      }
      return NextResponse.json({ error: 'Forbidden: You do not have permission to invite this role or location' }, { status: 403 })
    }

    // Check if user is already an active member in this organization
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { organizationId: authCtx.organizationId },
        },
      },
    })

    if (existingUser && existingUser.memberships.length > 0) {
      const activeMem = existingUser.memberships.find((m) => m.status === 'ACTIVE')
      if (activeMem) {
        return NextResponse.json(
          { error: `${email} is already an active member of this organization (${activeMem.role}).` },
          { status: 409 }
        )
      }
    }

    // Generate cryptographic single-use token (32 random bytes)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    // Execute in a transaction: invalidate existing pending invitations for this email + create new invitation + log audit
    const result = await prisma.$transaction(async (tx) => {
      // Invalidate existing pending invites for this email in this organization
      await tx.staffInvitation.updateMany({
        where: {
          organizationId: authCtx.organizationId,
          email,
          revokedAt: null,
          acceptedAt: null,
        },
        data: { revokedAt: new Date() },
      })

      // Create new invitation
      const invitation = await tx.staffInvitation.create({
        data: {
          organizationId: authCtx.organizationId,
          locationId,
          email,
          role,
          tokenHash,
          invitedById: authCtx.userId,
          expiresAt,
        },
      })

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          organizationId: authCtx.organizationId,
          restaurantId: authCtx.organizationId,
          locationId,
          actorId: authCtx.userId,
          actorName: authCtx.name || 'Manager',
          targetType: 'StaffInvitation',
          targetId: invitation.id,
          action: 'STAFF_INVITED',
          metadata: {
            invitedEmail: email,
            invitedRole: role,
            locationId,
            expiresAt: expiresAt.toISOString(),
          },
        },
      })

      return invitation
    })

    const origin = req.nextUrl.origin || 'http://localhost:3000'
    const inviteUrl = `${origin}/invite?token=${rawToken}`

    // Fetch restaurant and location names to personalize the email
    const [restaurant, location] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id: authCtx.organizationId },
        select: { name: true },
      }),
      locationId
        ? prisma.location.findUnique({
            where: { id: locationId },
            select: { name: true },
          })
        : null,
    ])

    // Dispatch transactional invitation email via Resend
    sendStaffInvitationEmail({
      to: email,
      inviterName: authCtx.name || 'Your Management Team',
      restaurantName: restaurant?.name || 'Prominentz Restaurant',
      role,
      locationName: location?.name || 'All Locations',
      inviteUrl,
      expiresAt,
    }).catch((err) => {
      console.error('[POST /api/staff/invitations] Email dispatch error:', err)
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: result.id,
        email: result.email,
        role: result.role,
        locationId: result.locationId,
        expiresAt: result.expiresAt,
        inviteUrl,
      },
    })
  } catch (error: unknown) {
    console.error('[POST /api/staff/invitations]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
