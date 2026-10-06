require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Running RBAC schema migrations...')

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'MANAGER', 'SERVER', 'KITCHEN');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OrganizationMembership" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "role" "OrganizationRole" NOT NULL,
      "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMembership_organizationId_userId_key" 
    ON "OrganizationMembership"("organizationId", "userId");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OrganizationMembership_organizationId_role_idx" 
    ON "OrganizationMembership"("organizationId", "role");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LocationAssignment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "membershipId" TEXT NOT NULL,
      "locationId" TEXT NOT NULL,
      CONSTRAINT "LocationAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "LocationAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "LocationAssignment_membershipId_locationId_key" 
    ON "LocationAssignment"("membershipId", "locationId");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "LocationAssignment_locationId_idx" 
    ON "LocationAssignment"("locationId");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StaffInvitation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "locationId" TEXT,
      "email" TEXT NOT NULL,
      "role" "OrganizationRole" NOT NULL,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "invitedById" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "acceptedAt" TIMESTAMP(3),
      "revokedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StaffInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StaffInvitation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "StaffInvitation_organizationId_email_idx" 
    ON "StaffInvitation"("organizationId", "email");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "organizationId" TEXT,
      "restaurantId" TEXT,
      "locationId" TEXT,
      "actorId" TEXT NOT NULL,
      "actorName" TEXT,
      "targetUserId" TEXT,
      "targetType" TEXT,
      "targetId" TEXT,
      "action" TEXT NOT NULL,
      "before" JSONB,
      "after" JSONB,
      "metadata" JSONB,
      "ipAddress" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Add columns to AuditLog if table existed previously without them
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "targetUserId" TEXT;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "metadata" JSONB;`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "locationId" TEXT;`)
  } catch (e) {}

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" 
    ON "AuditLog"("organizationId", "createdAt");
  `)

  console.log('✅ RBAC tables and enums created successfully!')

  // Backfill existing User records into OrganizationMembership
  console.log('Backfilling existing users into OrganizationMembership...')
  const users = await prisma.user.findMany({
    include: {
      employee: { select: { locationId: true } },
      restaurant: {
        select: {
          id: true,
          locations: { select: { id: true } },
        },
      },
    },
  })

  let backfilledCount = 0
  for (const u of users) {
    const orgId = u.restaurantId || u.restaurant?.id
    if (!orgId) continue

    const role = (['OWNER', 'MANAGER', 'SERVER', 'KITCHEN'].includes(u.role)
      ? u.role
      : 'SERVER')

    // Upsert membership
    const membership = await prisma.organizationMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: u.id,
        },
      },
      update: {
        role,
        status: u.isActive ? 'ACTIVE' : 'SUSPENDED',
      },
      create: {
        organizationId: orgId,
        userId: u.id,
        role,
        status: u.isActive ? 'ACTIVE' : 'SUSPENDED',
      },
    })

    // Assign locations
    const userLocationIds = new Set()
    if (u.employee?.locationId) {
      userLocationIds.add(u.employee.locationId)
    }
    // If owner or manager with no specific location, assign all restaurant locations
    if (role === 'OWNER' && u.restaurant?.locations) {
      u.restaurant.locations.forEach((l) => userLocationIds.add(l.id))
    }

    for (const locId of userLocationIds) {
      await prisma.locationAssignment.upsert({
        where: {
          membershipId_locationId: {
            membershipId: membership.id,
            locationId: locId,
          },
        },
        update: {},
        create: {
          membershipId: membership.id,
          locationId: locId,
        },
      })
    }

    backfilledCount++
  }

  console.log(`✅ Successfully backfilled ${backfilledCount} user memberships with location assignments!`)
}

main()
  .catch((err) => {
    console.error('Migration / Backfill Error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
