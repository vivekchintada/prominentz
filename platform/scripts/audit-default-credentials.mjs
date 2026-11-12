/**
 * One-off remediation for the default staff accounts the old onboarding flow created.
 *
 * GET /api/onboarding used to create manager./server./kitchen.<slug>@resto.app for every
 * restaurant with the shared password "resto123", and the team step fell back to the same
 * password. Restaurant slugs are public (menu/QR links), so these were guessable logins.
 *
 * Also lists accounts whose email matches PLATFORM_ADMIN_EMAILS case-insensitively, so you
 * can confirm each /hq admin address belongs to exactly one account you recognise.
 *
 *   node scripts/audit-default-credentials.mjs              # report only, changes nothing
 *   node scripts/audit-default-credentials.mjs --deactivate # deactivate every account found
 *
 * Reads DATABASE_URL from the environment or platform/.env.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match || process.env[match[1]] !== undefined) continue
    let val = match[2] || ''
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    process.env[match[1]] = val
  }
}

const DEFAULT_PASSWORD = 'resto123'
const deactivate = process.argv.includes('--deactivate')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, role: true, passwordHash: true, restaurantId: true, createdAt: true },
  })

  const flagged = []
  for (const u of users) {
    const generatedEmail = /^(manager|server|kitchen)\..+@resto\.app$/i.test(u.email)
    const defaultPassword = u.passwordHash ? await bcrypt.compare(DEFAULT_PASSWORD, u.passwordHash) : false
    if (generatedEmail || defaultPassword) {
      flagged.push({ ...u, reason: [generatedEmail && 'generated email', defaultPassword && 'password is resto123'].filter(Boolean).join(', ') })
    }
  }

  console.log(`Checked ${users.length} active accounts.`)
  console.log(`\nAccounts with default credentials: ${flagged.length}`)
  for (const u of flagged) console.log(`  ${u.role.padEnd(8)} ${u.email}  (restaurant ${u.restaurantId}; ${u.reason})`)

  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (adminEmails.length) {
    console.log('\nPlatform admin addresses (each should map to exactly one account you recognise):')
    for (const email of adminEmails) {
      const matches = await prisma.user.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, role: true, isActive: true, createdAt: true },
      })
      console.log(`  ${email}: ${matches.length} account(s)`)
      for (const m of matches) console.log(`    ${m.email}  ${m.role}  active=${m.isActive}  created ${m.createdAt.toISOString()}`)
    }
  }

  if (deactivate && flagged.length) {
    const ids = flagged.map((u) => u.id)
    const res = await prisma.user.updateMany({ where: { id: { in: ids } }, data: { isActive: false } })
    await prisma.employee.updateMany({ where: { userId: { in: ids } }, data: { isActive: false } })
    console.log(`\nDeactivated ${res.count} account(s). Owners can re-enable a real staff member from Staff & Access after setting a new password.`)
  } else if (flagged.length) {
    console.log('\nNothing changed. Re-run with --deactivate to disable these accounts.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
