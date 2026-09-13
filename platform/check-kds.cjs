const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function run() {
  const items = await p.menuItem.findMany({ select: { id: true, name: true, kdsStation: true }, take: 15 })
  console.log('Menu Items kdsStation:')
  console.log(JSON.stringify(items, null, 2))

  const orders = await p.order.findMany({ 
    where: { status: { in: ['OPEN', 'SENT_TO_KITCHEN'] } },
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log('\nRecent Active Orders:')
  console.log(JSON.stringify(orders, null, 2))

  const tickets = await p.kdsTicket.findMany({
    where: { status: { in: ['NEW', 'IN_PROGRESS'] } },
    select: { id: true, station: true, status: true, orderId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  console.log('\nActive KDS Tickets:')
  console.log(JSON.stringify(tickets, null, 2))

  await p.$disconnect()
}

run().catch(e => { console.error(e); p.$disconnect() })
