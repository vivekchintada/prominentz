const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
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
} catch (e) {}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const restaurant = await prisma.restaurant.findFirst()
  const location = await prisma.location.findFirst({ where: { restaurantId: restaurant.id } })
  const tables = await prisma.table.findMany({ where: { locationId: location.id } })
  const menuItems = await prisma.menuItem.findMany({ where: { category: { restaurantId: restaurant.id } } })
  const serverUser = await prisma.user.findFirst({ where: { restaurantId: restaurant.id } })

  const paidOrders = await prisma.order.findMany({
    where: { status: 'PAID' },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`Currently found ${paidOrders.length} paid orders in database.`)

  // Ensure we have at least 18 paid orders (6 Dine In, 6 Take Away, 6 Delivery)
  const needed = Math.max(0, 18 - paidOrders.length)
  for (let i = 0; i < needed; i++) {
    const table = tables[i % tables.length]
    const item = menuItems[i % menuItems.length]
    const subtotal = Number(item.price || 28)
    const tax = Math.round(subtotal * 0.1 * 100) / 100
    const total = subtotal + tax
    const createdAt = new Date(Date.now() - (i + 1) * 12 * 60 * 1000)

    const newOrder = await prisma.order.create({
      data: {
        tableId: table.id,
        serverId: serverUser?.id || null,
        guestCount: 2,
        notes: 'Dine In',
        status: 'PAID',
        subtotal,
        tax,
        total,
        createdAt,
        updatedAt: createdAt,
      },
    })

    await prisma.orderItem.create({
      data: {
        orderId: newOrder.id,
        menuItemId: item.id,
        quantity: 1,
        priceAtOrder: subtotal,
        status: 'SERVED',
        createdAt,
      },
    })

    await prisma.payment.create({
      data: {
        orderId: newOrder.id,
        processedBy: serverUser?.id || null,
        method: 'CARD',
        status: 'COMPLETED',
        subtotal,
        tax,
        tip: 5.0,
        total: total + 5.0,
        createdAt,
      },
    })
  }

  // Refetch all paid orders
  const allPaid = await prisma.order.findMany({
    where: { status: 'PAID' },
    orderBy: { createdAt: 'desc' },
  })

  // Balance the top 18 orders interleaved so each category has 6 orders
  // and chronological order has a realistic alternating mix
  const typesPattern = [
    { type: 'Dine In', notes: 'Dine In - Table 1' },
    { type: 'Take Away', notes: 'Take Away - Counter Pickup' },
    { type: 'Delivery', notes: 'Delivery - DoorDash #8921' },
    { type: 'Dine In', notes: 'Dine In - Window Booth' },
    { type: 'Take Away', notes: 'Take Away - Express Bag' },
    { type: 'Delivery', notes: 'Delivery - UberEats #4412' },
    { type: 'Dine In', notes: 'Dine In - Patio Table 3' },
    { type: 'Take Away', notes: 'Take Away - Quick To-Go' },
    { type: 'Delivery', notes: 'Delivery - Courier #1029' },
    { type: 'Dine In', notes: 'Dine In - Family Table' },
    { type: 'Take Away', notes: 'Take Away - Online Web Pickup' },
    { type: 'Delivery', notes: 'Delivery - DoorDash #9931' },
    { type: 'Dine In', notes: 'Dine In - Table 2' },
    { type: 'Take Away', notes: 'Take Away - Call-in Order' },
    { type: 'Delivery', notes: 'Delivery - UberEats #7721' },
    { type: 'Dine In', notes: 'Dine In - VIP Table' },
    { type: 'Take Away', notes: 'Take Away - Curbside Pickup' },
    { type: 'Delivery', notes: 'Delivery - Direct Dispatch' },
  ]

  for (let i = 0; i < Math.min(allPaid.length, typesPattern.length); i++) {
    const pattern = typesPattern[i]
    await prisma.order.update({
      where: { id: allPaid[i].id },
      data: { notes: pattern.notes },
    })
    console.log(`Order #${allPaid[i].id.slice(-5).toUpperCase()} set to ${pattern.type}`)
  }

  console.log('Done: Successfully balanced 6 Dine In, 6 Take Away, and 6 Delivery orders.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
