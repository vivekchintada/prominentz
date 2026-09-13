import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Cache on globalThis in ALL environments to prevent connection pool
// exhaustion in serverless (Vercel, Railway) cold starts.
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient()
}

export const prisma = globalForPrisma.prisma

