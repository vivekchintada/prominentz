import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// ─── GET /api/invitations/:token ──────────────────────────────────────────────
// Validates token and returns public invitation context for the signup screen.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const invitation = await prisma.staffInvitation.findUnique({
      where: { tokenHash },
      include: {
        restaurant: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    })

    if (!invitation) {
      return NextResponse.json({ valid: false, error: 'Invitation link is invalid or does not exist.' }, { status: 404 })
    }

    if (invitation.revokedAt) {
      return NextResponse.json({ valid: false, error: 'This invitation has been revoked by management.' }, { status: 410 })
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ valid: false, error: 'This invitation has already been accepted.' }, { status: 410 })
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ valid: false, error: 'This invitation link has expired.' }, { status: 410 })
    }

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.restaurant?.name || 'Restaurant',
      locationName: invitation.location?.name || 'All Locations',
      expiresAt: invitation.expiresAt,
    })
  } catch (error: any) {
    console.error('[GET /api/invitations/:token]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/invitations/:token ─────────────────────────────────────────────
// Accepts the invitation and creates/links the user account into the organization.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const invitation = await prisma.staffInvitation.findUnique({
      where: { tokenHash },
      include: {
        restaurant: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or invalid token' }, { status: 404 })
    }

    if (invitation.revokedAt) {
      return NextResponse.json({ error: 'This invitation has been revoked.' }, { status: 410 })
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ error: 'This invitation was already accepted.' }, { status: 410 })
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 })
    }

    const body = await req.json().catch(() => ({}))
    const session = await auth()
    const sessionEmail = session?.user?.email?.toLowerCase().trim()
    const inviteEmail = invitation.email.toLowerCase().trim()

    let targetUserId: string | null = null

    // If the active session in the browser belongs to the invited email, use it directly
    if (session?.user?.id && sessionEmail === inviteEmail) {
      targetUserId = session.user.id
    } else {
      // The user is either unauthenticated OR authenticated as a different account (e.g. Owner testing in same browser)
      // Must authenticate or register the account for the invited email!
      const name = body.name?.trim()
      const password = body.password

      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
      }

      // Check if user with this invited email already exists in User table
      let existingUser = await prisma.user.findUnique({
        where: { email: inviteEmail },
      })

      if (existingUser) {
        // Verify password
        const valid = await bcrypt.compare(password, existingUser.passwordHash)
        if (!valid) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please provide the correct existing password to join this organization.' },
            { status: 401 }
          )
        }
        targetUserId = existingUser.id
      } else {
        const passwordHash = await bcrypt.hash(password, 10)
        const newUser = await prisma.user.create({
          data: {
            restaurantId: invitation.organizationId,
            email: inviteEmail,
            name: name || inviteEmail.split('@')[0],
            passwordHash,
            role: invitation.role as any,
            isActive: true,
          },
        })
        targetUserId = newUser.id
      }
    }

    // Process acceptance atomically
    await prisma.$transaction(async (tx) => {
      // 1. Create or update OrganizationMembership
      const membership = await tx.organizationMembership.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: targetUserId!,
          },
        },
        update: {
          role: invitation.role,
          status: 'ACTIVE',
        },
        create: {
          organizationId: invitation.organizationId,
          userId: targetUserId!,
          role: invitation.role,
          status: 'ACTIVE',
        },
      })

      // 2. If invitation specified a location, assign it
      if (invitation.locationId) {
        await tx.locationAssignment.upsert({
          where: {
            membershipId_locationId: {
              membershipId: membership.id,
              locationId: invitation.locationId,
            },
          },
          update: {},
          create: {
            membershipId: membership.id,
            locationId: invitation.locationId,
          },
        })
      }

      // 3. Mark invitation accepted atomically with single-use guard
      const updated = await tx.staffInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
        },
        data: { acceptedAt: new Date() },
      })

      if (updated.count === 0) {
        throw new Error('This invitation has already been accepted or revoked.')
      }

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          restaurantId: invitation.organizationId,
          locationId: invitation.locationId,
          actorId: targetUserId!,
          actorName: (invitation as any).restaurant?.name ? `${invitation.email.split('@')[0]} (New Member)` : invitation.email,
          targetType: 'StaffInvitation',
          targetId: invitation.id,
          targetUserId,
          action: 'STAFF_INVITATION_ACCEPTED',
          metadata: {
            email: invitation.email,
            role: invitation.role,
          },
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Welcome to ${invitation.restaurant?.name || 'the team'}! Your account has been activated.`,
      role: invitation.role,
    })
  } catch (error: any) {
    console.error('[POST /api/invitations/:token]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
