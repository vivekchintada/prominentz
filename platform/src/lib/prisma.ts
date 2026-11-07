import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  // Long-running servers (Docker/Railway/Render) need a real pool for dinner rush.
  // On serverless, set DB_POOL_MAX=2-3 and point DATABASE_URL at a pooler (PgBouncer / Neon / Supabase).
  const max = Number(process.env.DB_POOL_MAX) || (process.env.NODE_ENV === 'production' ? 10 : 5)
  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Fail slow queries instead of letting them pile up and starve the pool.
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 15000,
  })
  pool.on('error', (err) => console.error('[DB Pool] idle client error:', err.message))
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Cache on globalThis in ALL environments to prevent connection pool
// exhaustion in serverless (Vercel, Railway) cold starts.
if (!globalForPrisma.prisma || !(globalForPrisma.prisma as any).staffInvitation) {
  globalForPrisma.prisma = createPrismaClient()
}

export const prisma = globalForPrisma.prisma

