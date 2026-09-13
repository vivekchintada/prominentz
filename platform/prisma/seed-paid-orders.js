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
  if (!restaurant) {
    console.error('No restaurant found.')
    return
  }

  const location = await prisma.location.findFirst({
    where: { restaurantId: restaurant.id },
  })
  if (!location) {
    console.error('No location found.')
    return
  }

  const tables = await prisma.table.findMany({
    where: { locationId: location.id },
  })
  if (tables.length === 0) {
    console.error('No tables found.')
    return
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { category: { restaurantId: restaurant.id } },
  })
  if (menuItems.length === 0) {
    console.error('No menu items found.')
    return
  }

  const serverUser = await prisma.user.findFirst({
    where: { restaurantId: restaurant.id },
  })

  // Count existing paid orders
  const existingPaidCount = await prisma.order.count({
    where: { table: { locationId: location.id }, status: 'PAID' },
  })
  console.log(`Current PAID orders count: ${existingPaidCount}`)

  // Desired seed template for realistic previous paid orders
  const samplePaidOrders = [
    {
      type: 'Dine In',
      notes: 'Dine In - Table Service',
      tableIdx: 0,
      customerName: 'Liam O\'Connor',
      phone: '+1 (555) 234-5678',
      items: [menuItems[0], menuItems[1] || menuItems[0]],
      method: 'CARD',
      tip: 15.0,
      minutesAgo: 65,
    },
    {
      type: 'Take Away',
      notes: 'Take Away - Pick up at counter',
      tableIdx: 1 % tables.length,
      customerName: 'Maria Gonzalez',
      phone: '+1 (555) 876-5432',
      items: [menuItems[2] || menuItems[0]],
      method: 'CASH',
      tip: 0,
      minutesAgo: 45,
    },
    {
      type: 'Delivery',
      notes: 'Delivery - DoorDash #8921',
      tableIdx: 2 % tables.length,
      customerName: 'James Smith',
      phone: '+1 (555) 345-6789',
      items: [menuItems[0], menuItems[2] || menuItems[0]],
      method: 'CARD',
      tip: 10.0,
      minutesAgo: 35,
    },
    {
      type: 'Dine In',
      notes: 'Dine In - Window Table',
      tableIdx: 3 % tables.length,
      customerName: 'Emma Watson',
      phone: '+1 (555) 456-7890',
      items: [menuItems[1] || menuItems[0], menuItems[3] || menuItems[0]],
      method: 'CARD',
      tip: 22.5,
      minutesAgo: 25,
    },
    {
      type: 'Delivery',
      notes: 'Delivery - UberEats #4412',
      tableIdx: 0,
      customerName: 'Lucas Vance',
      phone: '+1 (555) 567-8901',
      items: [menuItems[0]],
      method: 'CARD',
      tip: 8.0,
      minutesAgo: 15,
    },
    {
      type: 'Take Away',
      notes: 'Take Away - Express bag',
      tableIdx: 1 % tables.length,
      customerName: 'Sophia Chen',
      phone: '+1 (555) 678-9012',
      items: [menuItems[2] || menuItems[0]],
      method: 'CASH',
      tip: 5.0,
      minutesAgo: 8,
    },
  ]

  const toCreate = Math.max(0, 6 - existingPaidCount)
  console.log(`Creating ${toCreate} additional paid orders to guarantee at least 6 previous paid orders...`)

  for (let i = 0; i < toCreate; i++) {
    const s = samplePaidOrders[i]
    const targetTable = tables[s.tableIdx]

    // Create customer if needed
    let customer = await prisma.customer.findFirst({
      where: { restaurantId: restaurant.id, phone: s.phone },
    })
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          restaurantId: restaurant.id,
          name: s.customerName,
          phone: s.phone,
        },
      })
    }

    // Calculate subtotal
    const subtotal = s.items.reduce((acc, it) => acc + Number(it.price || 25), 0)
    const tax = Math.round(subtotal * 0.1 * 100) / 100
    const total = subtotal + tax

    const createdAt = new Date(Date.now() - s.minutesAgo * 60 * 1000)

    const order = await prisma.order.create({
      data: {
        tableId: targetTable.id,
        serverId: serverUser?.id || null,
        customerId: customer.id,
        guestCount: 2,
        notes: s.notes,
        status: 'PAID',
        subtotal,
        tax,
        total,
        createdAt,
        updatedAt: createdAt,
      },
    })

    // Create order items
    for (const item of s.items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: item.id,
          quantity: 1,
          unitPrice: Number(item.price || 25),
          seatNumber: 1,
          status: 'SERVED',
          createdAt,
        },
      })
    }

    // Create completed payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        processedBy: serverUser?.id || null,
        method: s.method,
        status: 'COMPLETED',
        subtotal,
        tax,
        tip: s.tip,
        total: total + s.tip,
        createdAt,
      },
    })

    console.log(`Created PAID order #${order.id.slice(-5).toUpperCase()} (${s.type} - ${s.customerName})`)
  }

  const finalCount = await prisma.order.count({
    where: { table: { locationId: location.id }, status: 'PAID' },
  })
  console.log(`Final total PAID orders count: ${finalCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
