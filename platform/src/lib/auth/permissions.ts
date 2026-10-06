import { prisma } from '@/lib/prisma'
import { OrganizationRole, MembershipStatus } from '@prisma/client'

export { OrganizationRole, MembershipStatus }

export interface AuthContext {
  userId: string
  organizationId: string
  membershipId: string
  role: OrganizationRole
  status: MembershipStatus
  locationIds: string[]
  name?: string | null
  email?: string | null
}

/**
 * Resolves the authenticated user's organization context strictly on the server.
 * Never trust organizationId, role, or locationIds sent in the request body/headers from the browser.
 */
export async function getAuthContext(sessionUser: {
  id: string
  email?: string | null
  restaurantId?: string | null
  role?: string | null
}): Promise<AuthContext | null> {
  if (!sessionUser?.id) return null

  // 1. Fetch user record from database
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      restaurantId: true,
      isActive: true,
    },
  })

  if (!user || !user.isActive) return null

  // 2. Fetch primary OrganizationMembership
  let membership = await prisma.organizationMembership.findFirst({
    where: { userId: user.id },
    include: {
      locationAssignments: {
        select: { locationId: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // 3. Fallback auto-provision if membership was not backfilled
  if (!membership) {
    const orgId = user.restaurantId || sessionUser.restaurantId
    if (!orgId) return null

    const initialRole: OrganizationRole = (
      ['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(user.role as any)
        ? (user.role as OrganizationRole)
        : 'SERVER'
    )

    membership = await prisma.organizationMembership.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role: initialRole,
        status: user.isActive ? 'ACTIVE' : 'SUSPENDED',
      },
      include: {
        locationAssignments: { select: { locationId: true } },
      },
    })

    // If owner or manager, assign existing locations automatically
    const locations = await prisma.location.findMany({
      where: { restaurantId: orgId },
      select: { id: true },
    })

    if (locations.length > 0 && (initialRole === 'OWNER' || initialRole === 'MANAGER')) {
      for (const loc of locations) {
        await prisma.locationAssignment.upsert({
          where: {
            membershipId_locationId: {
              membershipId: membership.id,
              locationId: loc.id,
            },
          },
          update: {},
          create: {
            membershipId: membership.id,
            locationId: loc.id,
          },
        })
      }

      membership = await prisma.organizationMembership.findUnique({
        where: { id: membership.id },
        include: {
          locationAssignments: { select: { locationId: true } },
        },
      })
    }
  }

  if (!membership) return null

  return {
    userId: user.id,
    organizationId: membership.organizationId,
    membershipId: membership.id,
    role: membership.role,
    status: membership.status,
    locationIds: membership.locationAssignments.map((a) => a.locationId),
    name: user.name,
    email: user.email,
  }
}

// ─── PERMISSION RULES (CENTRAL AUTHORIZATION MATRIX) ──────────────────────────

/**
 * Capability: Invite User
 * - Owner: Can invite any role to any location (or no location)
 * - Manager: Can invite SERVER or KITCHEN ONLY, and MUST specify an assigned location
 * - Server / Kitchen: ❌ Cannot invite anyone
 */
export function canInviteUser(
  actor: AuthContext,
  targetRole: OrganizationRole,
  locationId?: string | null
): boolean {
  if (actor.status !== 'ACTIVE') return false

  if (actor.role === 'OWNER') return true

  if (actor.role === 'MANAGER') {
    const isSubordinateRole = targetRole === 'SERVER' || targetRole === 'KITCHEN'
    if (!isSubordinateRole) return false

    // Managers cannot invite without location scope or outside their assigned locations
    if (!locationId) return false
    return actor.locationIds.includes(locationId)
  }

  return false
}

/**
 * Capability: Change Staff Role
 * - Owner: Can change any role to any role (except demoting the last active owner)
 * - Manager: Can only toggle between SERVER ↔ KITCHEN for users within their assigned locations
 * - Server / Kitchen: ❌ Cannot change any roles
 */
export function canChangeUserRole(
  actor: AuthContext,
  targetMembership: {
    userId: string
    role: OrganizationRole
    locationIds?: string[]
  },
  newRole: OrganizationRole
): boolean {
  if (actor.status !== 'ACTIVE') return false

  // Users cannot change their own role
  if (actor.userId === targetMembership.userId) return false

  if (actor.role === 'OWNER') {
    // Owners can assign any role
    return true
  }

  if (actor.role === 'MANAGER') {
    // Managers cannot touch Owners or other Managers
    if (targetMembership.role === 'OWNER' || targetMembership.role === 'MANAGER') {
      return false
    }

    // Managers cannot promote anyone to Owner or Manager
    if (newRole === 'OWNER' || newRole === 'MANAGER') {
      return false
    }

    // Target must only be SERVER or KITCHEN
    const isSubordinateNewRole = newRole === 'SERVER' || newRole === 'KITCHEN'
    if (!isSubordinateNewRole) return false

    // Target must belong to at least one location assigned to this Manager
    const targetLocations = targetMembership.locationIds || []
    if (targetLocations.length === 0) return false

    const hasCommonLocation = targetLocations.some((locId) => actor.locationIds.includes(locId))
    return hasCommonLocation
  }

  return false
}

/**
 * Capability: Deactivate / Suspend Staff
 * - Owner: Can deactivate any user (except themselves / the last active owner)
 * - Manager: Can only deactivate SERVER or KITCHEN within their assigned locations
 * - Server / Kitchen: ❌ Cannot deactivate anyone
 */
export function canDeactivateUser(
  actor: AuthContext,
  targetMembership: {
    userId: string
    role: OrganizationRole
    locationIds?: string[]
  }
): boolean {
  if (actor.status !== 'ACTIVE') return false

  // Cannot deactivate oneself
  if (actor.userId === targetMembership.userId) return false

  if (actor.role === 'OWNER') {
    return true
  }

  if (actor.role === 'MANAGER') {
    // Managers cannot deactivate Owners or other Managers
    if (targetMembership.role === 'OWNER' || targetMembership.role === 'MANAGER') {
      return false
    }

    // Target must be in a location managed by this Manager
    const targetLocations = targetMembership.locationIds || []
    if (targetLocations.length === 0) return false

    return targetLocations.some((locId) => actor.locationIds.includes(locId))
  }

  return false
}

/**
 * Capability: Assign Locations to Staff
 * - Owner: Can assign any location in the organization
 * - Manager: Can only assign locations that they themselves are assigned to
 * - Server / Kitchen: ❌ Cannot assign locations
 */
export function canAssignLocations(
  actor: AuthContext,
  targetMembership: {
    userId: string
    role: OrganizationRole
  },
  newLocationIds: string[]
): boolean {
  if (actor.status !== 'ACTIVE') return false

  // Users cannot expand their own locations
  if (actor.userId === targetMembership.userId) return false

  if (actor.role === 'OWNER') return true

  if (actor.role === 'MANAGER') {
    // Managers cannot reassign Owners or Managers
    if (targetMembership.role === 'OWNER' || targetMembership.role === 'MANAGER') {
      return false
    }

    // All new locationIds must be inside actor's assigned locations
    return newLocationIds.every((locId) => actor.locationIds.includes(locId))
  }

  return false
}

/**
 * Capability: Manage Location Resources
 */
export function canManageLocation(actor: AuthContext, locationId: string): boolean {
  if (actor.status !== 'ACTIVE') return false
  if (actor.role === 'OWNER') return true
  if (actor.role === 'MANAGER') return actor.locationIds.includes(locationId)
  return false
}

/**
 * Capability: Manage Billing and Organization Ownership
 * - Owner: ✅
 * - Manager / Server / Kitchen: ❌
 */
export function canManageBilling(actor: AuthContext): boolean {
  return actor.status === 'ACTIVE' && actor.role === 'OWNER'
}

/**
 * Capability: View Audit Log
 * - Owner: ✅ All organization audit records
 * - Manager: ✅ Audit logs restricted to their assigned locations
 * - Server / Kitchen: ❌
 */
export function canViewAuditLog(actor: AuthContext, locationId?: string | null): boolean {
  if (actor.status !== 'ACTIVE') return false
  if (actor.role === 'OWNER') return true
  if (actor.role === 'MANAGER') {
    if (!locationId) return true // can view manager-scoped log
    return actor.locationIds.includes(locationId)
  }
  return false
}
