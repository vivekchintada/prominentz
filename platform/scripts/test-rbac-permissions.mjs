import assert from 'node:assert/strict'

// ── RBAC Permission Rules (Simulated/Direct from permissions.ts matrix) ──────
// Testing all role / capability combinations specified in Phase 1, Phase 3, Phase 7, Phase 8

function canInviteUser(actor, targetRole, locationId) {
  if (actor.status !== 'ACTIVE') return false
  if (actor.role === 'OWNER') return true

  if (actor.role === 'MANAGER') {
    const isSubordinateRole = targetRole === 'SERVER' || targetRole === 'KITCHEN'
    if (!isSubordinateRole) return false
    if (!locationId) return false
    return actor.locationIds.includes(locationId)
  }

  return false
}

function canChangeUserRole(actor, targetMembership, newRole) {
  if (actor.status !== 'ACTIVE') return false
  if (actor.userId === targetMembership.userId) return false // Cannot change own role

  if (actor.role === 'OWNER') {
    return true
  }

  if (actor.role === 'MANAGER') {
    if (targetMembership.role === 'OWNER' || targetMembership.role === 'MANAGER') {
      return false
    }
    if (newRole === 'OWNER' || newRole === 'MANAGER') {
      return false
    }

    const isSubordinateNewRole = newRole === 'SERVER' || newRole === 'KITCHEN'
    if (!isSubordinateNewRole) return false

    const targetLocations = targetMembership.locationIds || []
    if (targetLocations.length === 0) return false

    return targetLocations.some((locId) => actor.locationIds.includes(locId))
  }

  return false
}

function canDeactivateUser(actor, targetMembership) {
  if (actor.status !== 'ACTIVE') return false
  if (actor.userId === targetMembership.userId) return false // Cannot deactivate self

  if (actor.role === 'OWNER') {
    return true
  }

  if (actor.role === 'MANAGER') {
    if (targetMembership.role === 'OWNER' || targetMembership.role === 'MANAGER') {
      return false
    }
    const targetLocations = targetMembership.locationIds || []
    if (targetLocations.length === 0) return false

    return targetLocations.some((locId) => actor.locationIds.includes(locId))
  }

  return false
}

function canAssignLocations(actor, targetMembership, newLocationIds) {
  if (actor.status !== 'ACTIVE') return false
  if (actor.userId === targetMembership.userId) return false

  if (actor.role === 'OWNER') return true

  if (actor.role === 'MANAGER') {
    if (targetMembership.role === 'OWNER' || targetMembership.role === 'MANAGER') {
      return false
    }
    return newLocationIds.every((locId) => actor.locationIds.includes(locId))
  }

  return false
}

function canManageBilling(actor) {
  return actor.status === 'ACTIVE' && actor.role === 'OWNER'
}

function canViewAuditLog(actor, locationId) {
  if (actor.status !== 'ACTIVE') return false
  if (actor.role === 'OWNER') return true
  if (actor.role === 'MANAGER') {
    if (!locationId) return true
    return actor.locationIds.includes(locationId)
  }
  return false
}

console.log('─── RUNNING RBAC AUTHORIZATION UNIT TESTS ───')

// Actors
const ownerActor = {
  userId: 'usr_owner_1',
  role: 'OWNER',
  status: 'ACTIVE',
  locationIds: ['loc_downtown', 'loc_uptown'],
}

const managerActor = {
  userId: 'usr_mgr_1',
  role: 'MANAGER',
  status: 'ACTIVE',
  locationIds: ['loc_downtown'], // Downtown only
}

const serverActor = {
  userId: 'usr_srv_1',
  role: 'SERVER',
  status: 'ACTIVE',
  locationIds: ['loc_downtown'],
}

const kitchenActor = {
  userId: 'usr_ktc_1',
  role: 'KITCHEN',
  status: 'ACTIVE',
  locationIds: ['loc_downtown'],
}

const suspendedManager = {
  userId: 'usr_mgr_susp',
  role: 'MANAGER',
  status: 'SUSPENDED',
  locationIds: ['loc_downtown'],
}

// ── TEST GROUP 1: canInviteUser ──
console.log('Test Group 1: canInviteUser')
// Owner → invite Manager: allowed
assert.equal(canInviteUser(ownerActor, 'MANAGER', 'loc_downtown'), true, 'Owner should be able to invite Manager')
assert.equal(canInviteUser(ownerActor, 'MANAGER', null), true, 'Owner should be able to invite Manager globally')
assert.equal(canInviteUser(ownerActor, 'SERVER', 'loc_uptown'), true, 'Owner should be able to invite Server anywhere')

// Manager → invite Manager: denied
assert.equal(canInviteUser(managerActor, 'MANAGER', 'loc_downtown'), false, 'Manager must NOT be able to invite Manager')

// Manager → invite Server at assigned location: allowed
assert.equal(canInviteUser(managerActor, 'SERVER', 'loc_downtown'), true, 'Manager can invite Server at assigned location')

// Manager → invite Server at another location: denied
assert.equal(canInviteUser(managerActor, 'SERVER', 'loc_uptown'), false, 'Manager must NOT invite Server at unassigned location')

// Manager → invite Server with no location: denied
assert.equal(canInviteUser(managerActor, 'SERVER', null), false, 'Manager must specify an assigned location')

// Server → invite anyone: denied
assert.equal(canInviteUser(serverActor, 'SERVER', 'loc_downtown'), false, 'Server cannot invite anyone')
assert.equal(canInviteUser(serverActor, 'KITCHEN', 'loc_downtown'), false, 'Server cannot invite anyone')

// Kitchen → invite anyone: denied
assert.equal(canInviteUser(kitchenActor, 'KITCHEN', 'loc_downtown'), false, 'Kitchen cannot invite anyone')

// Suspended user cannot invite anyone
assert.equal(canInviteUser(suspendedManager, 'SERVER', 'loc_downtown'), false, 'Suspended manager cannot invite anyone')
console.log('✓ Group 1 Passed')

// ── TEST GROUP 2: canChangeUserRole ──
console.log('Test Group 2: canChangeUserRole')
const downtownServer = { userId: 'usr_target_1', role: 'SERVER', locationIds: ['loc_downtown'] }
const uptownServer = { userId: 'usr_target_2', role: 'SERVER', locationIds: ['loc_uptown'] }
const downtownManager = { userId: 'usr_target_mgr', role: 'MANAGER', locationIds: ['loc_downtown'] }

// Manager → promote Server to Manager: denied
assert.equal(canChangeUserRole(managerActor, downtownServer, 'MANAGER'), false, 'Manager must NOT promote Server to Manager')

// Manager → promote Server to Owner: denied
assert.equal(canChangeUserRole(managerActor, downtownServer, 'OWNER'), false, 'Manager must NOT promote Server to Owner')

// Manager → toggle Server to Kitchen at assigned location: allowed
assert.equal(canChangeUserRole(managerActor, downtownServer, 'KITCHEN'), true, 'Manager can toggle Server to Kitchen at assigned location')

// Manager → toggle Server to Kitchen at another location: denied
assert.equal(canChangeUserRole(managerActor, uptownServer, 'KITCHEN'), false, 'Manager cannot change role of staff outside assigned location')

// Manager → change another Manager or Owner: denied
assert.equal(canChangeUserRole(managerActor, downtownManager, 'SERVER'), false, 'Manager cannot demote another Manager')

// Owner → change any role: allowed
assert.equal(canChangeUserRole(ownerActor, downtownServer, 'MANAGER'), true, 'Owner can promote Server to Manager')
assert.equal(canChangeUserRole(ownerActor, downtownManager, 'SERVER'), true, 'Owner can demote Manager to Server')

// User cannot change own role: denied
assert.equal(canChangeUserRole(ownerActor, { userId: ownerActor.userId, role: 'OWNER' }, 'MANAGER'), false, 'User cannot change own role')
assert.equal(canChangeUserRole(managerActor, { userId: managerActor.userId, role: 'MANAGER' }, 'SERVER'), false, 'User cannot change own role')
console.log('✓ Group 2 Passed')

// ── TEST GROUP 3: canDeactivateUser ──
console.log('Test Group 3: canDeactivateUser')
// Owner deactivating Server or Manager: allowed
assert.equal(canDeactivateUser(ownerActor, downtownServer), true, 'Owner can deactivate Server')
assert.equal(canDeactivateUser(ownerActor, downtownManager), true, 'Owner can deactivate Manager')

// User cannot deactivate self
assert.equal(canDeactivateUser(ownerActor, { userId: ownerActor.userId, role: 'OWNER' }), false, 'Owner cannot deactivate self')
assert.equal(canDeactivateUser(managerActor, { userId: managerActor.userId, role: 'MANAGER' }), false, 'Manager cannot deactivate self')

// Manager deactivating Server in assigned location: allowed
assert.equal(canDeactivateUser(managerActor, downtownServer), true, 'Manager can deactivate Server in assigned location')

// Manager deactivating Server in unassigned location: denied
assert.equal(canDeactivateUser(managerActor, uptownServer), false, 'Manager cannot deactivate staff outside assigned location')

// Manager deactivating Owner or Manager: denied
assert.equal(canDeactivateUser(managerActor, downtownManager), false, 'Manager cannot deactivate another Manager')
assert.equal(canDeactivateUser(managerActor, { userId: 'usr_owner_1', role: 'OWNER', locationIds: ['loc_downtown'] }), false, 'Manager cannot deactivate Owner')

// Server deactivating anyone: denied
assert.equal(canDeactivateUser(serverActor, downtownServer), false, 'Server cannot deactivate anyone')
console.log('✓ Group 3 Passed')

// ── TEST GROUP 4: canAssignLocations ──
console.log('Test Group 4: canAssignLocations')
// Owner can assign any location: allowed
assert.equal(canAssignLocations(ownerActor, downtownServer, ['loc_downtown', 'loc_uptown', 'loc_airport']), true, 'Owner can assign any location')

// Manager can only assign within their assigned locations:
assert.equal(canAssignLocations(managerActor, downtownServer, ['loc_downtown']), true, 'Manager can assign downtown location')
assert.equal(canAssignLocations(managerActor, downtownServer, ['loc_downtown', 'loc_uptown']), false, 'Manager cannot assign uptown location')

// Manager cannot assign locations to another Manager or Owner:
assert.equal(canAssignLocations(managerActor, downtownManager, ['loc_downtown']), false, 'Manager cannot assign locations to another Manager')
console.log('✓ Group 4 Passed')

// ── TEST GROUP 5: canManageBilling ──
console.log('Test Group 5: canManageBilling')
assert.equal(canManageBilling(ownerActor), true, 'Owner can manage billing')
assert.equal(canManageBilling(managerActor), false, 'Manager cannot manage billing')
assert.equal(canManageBilling(serverActor), false, 'Server cannot manage billing')
assert.equal(canManageBilling(kitchenActor), false, 'Kitchen cannot manage billing')
console.log('✓ Group 5 Passed')

// ── TEST GROUP 6: canViewAuditLog ──
console.log('Test Group 6: canViewAuditLog')
assert.equal(canViewAuditLog(ownerActor), true, 'Owner can view audit log')
assert.equal(canViewAuditLog(managerActor, 'loc_downtown'), true, 'Manager can view audit log for assigned location')
assert.equal(canViewAuditLog(managerActor, 'loc_uptown'), false, 'Manager cannot view audit log for unassigned location')
assert.equal(canViewAuditLog(serverActor), false, 'Server cannot view audit log')
assert.equal(canViewAuditLog(kitchenActor), false, 'Kitchen cannot view audit log')
console.log('✓ Group 6 Passed')

console.log('\n🎉 ALL RBAC AUTHORIZATION UNIT TESTS PASSED SUCCESSFULLY!')
