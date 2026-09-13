const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Load environment variables manually for Prisma config compatibility in seed script
const fs = require('fs')
const path = require('path')
try {
  const envPath = path.resolve(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        process.env[key] = value
      }
    })
  }
} catch (e) {
  // Ignore
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('resto123', 10)

  // 1. Create Restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'resto-fine-dining' },
    update: {},
    create: {
      name: 'Resto Fine Dining',
      slug: 'resto-fine-dining',
    },
  })

  // 2. Create Location
  const location = await prisma.location.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Harbour Lane',
      address: '12 Harbour Lane, New City',
      phone: '+1 (555) 012 3456',
      timezone: 'UTC',
    },
  })

  // 3. Create Users for all 4 roles
  const users = [
    {
      email: 'owner@resto.com',
      name: 'John Owner',
      role: 'OWNER',
    },
    {
      email: 'manager@resto.com',
      name: 'Sarah Manager',
      role: 'MANAGER',
    },
    {
      email: 'server@resto.com',
      name: 'David Server',
      role: 'SERVER',
    },
    {
      email: 'kitchen@resto.com',
      name: 'Chef Kitchen',
      role: 'KITCHEN',
    },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        restaurantId: restaurant.id,
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    })
  }

  // 4. Create some test tables
  const tables = [
    { name: 'Table 1', capacity: 2, posX: 1, posY: 1 },
    { name: 'Table 2', capacity: 4, posX: 1, posY: 2 },
    { name: 'Table 3', capacity: 4, posX: 2, posY: 1 },
    { name: 'Table 4', capacity: 6, posX: 2, posY: 2 },
    { name: 'Bar 1', capacity: 1, posX: 3, posY: 1 },
    { name: 'Bar 2', capacity: 1, posX: 3, posY: 2 },
  ]

  for (const t of tables) {
    await prisma.table.create({
      data: {
        locationId: location.id,
        name: t.name,
        capacity: t.capacity,
        posX: t.posX,
        posY: t.posY,
        status: 'EMPTY',
      },
    })
  }

  console.log('Seed completed successfully. Users created with password: "resto123"')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
