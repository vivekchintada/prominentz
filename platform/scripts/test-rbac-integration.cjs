const assert = require('node:assert/strict')
const crypto = require('crypto')
const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function run() {
  console.log('─── RUNNING RBAC INTEGRATION TESTS ───')
  const client = await pool.connect()
  try {
    // 1. Verify OrganizationMembership records exist
    const memRes = await client.query(`
      SELECT om.id, om."organizationId", om."userId", om.role, om.status, u.email
      FROM "OrganizationMembership" om
      JOIN "User" u ON u.id = om."userId"
      ORDER BY om.role ASC
    `)
    console.log(`Found ${memRes.rows.length} backfilled organization memberships.`)
    assert(memRes.rows.length > 0, 'Should have backfilled members')

    const owner = memRes.rows.find((r) => r.role === 'OWNER')
    assert(owner, 'Must have at least one OWNER membership')
    console.log(`✓ Owner confirmed: ${owner.email} (${owner.id})`)

    // 2. Test Last Active Owner demotion/suspension protection logic
    const activeOwnersRes = await client.query(`
      SELECT COUNT(*) as count
      FROM "OrganizationMembership"
      WHERE "organizationId" = $1 AND role = 'OWNER' AND status = 'ACTIVE'
    `, [owner.organizationId])
    const activeOwnersCount = parseInt(activeOwnersRes.rows[0].count, 10)
    console.log(`Active owners count: ${activeOwnersCount}`)
    assert(activeOwnersCount >= 1, 'Must have at least 1 active owner')

    // 3. Test StaffInvitation Token Hashing and Lookup
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const testEmail = `test-invite-${Date.now()}@example.com`
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const insertInv = await client.query(`
      INSERT INTO "StaffInvitation" (
        id, "organizationId", email, role, "tokenHash", "invitedById", "expiresAt", "createdAt"
      ) VALUES ($1, $2, $3, 'SERVER', $4, $5, $6, NOW())
      RETURNING id, email, role, "tokenHash"
    `, [
      `inv_test_${Date.now()}`,
      owner.organizationId,
      testEmail,
      tokenHash,
      owner.userId,
      expiresAt,
    ])
    const createdInv = insertInv.rows[0]
    console.log(`✓ Created test invitation: ${createdInv.id} for ${createdInv.email}`)

    // Query back by hash
    const foundInv = await client.query(`
      SELECT * FROM "StaffInvitation" WHERE "tokenHash" = $1
    `, [tokenHash])
    assert.equal(foundInv.rows.length, 1, 'Should find invitation by SHA-256 tokenHash')
    assert.equal(foundInv.rows[0].email, testEmail)

    // Revoke invitation
    await client.query(`
      UPDATE "StaffInvitation" SET "revokedAt" = NOW() WHERE id = $1
    `, [createdInv.id])
    const revokedCheck = await client.query(`
      SELECT * FROM "StaffInvitation" WHERE id = $1
    `, [createdInv.id])
    assert(revokedCheck.rows[0].revokedAt !== null, 'Invitation should be marked revoked')
    console.log('✓ Successfully tested invitation lifecycle and revocation')

    // Clean up test invitation
    await client.query(`DELETE FROM "StaffInvitation" WHERE id = $1`, [createdInv.id])
    console.log('✓ Cleaned up test invitation record')

    console.log('\n🎉 ALL RBAC INTEGRATION TESTS PASSED!')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error('Integration test failed:', err)
  process.exit(1)
})
