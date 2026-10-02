import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'Dashboard | Resto AI Manager',
}

export default async function MobileDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id, isActive: true },
  })
  let locationId = employee?.locationId
  if (!locationId) {
    const loc = await prisma.location.findFirst({ where: { restaurantId: user.restaurantId } })
    locationId = loc?.id
  }

  let stats = { openOrders: 0, activeTables: 0, totalTables: 0, todaySales: 0, avgKds: 0 }
  let recentEvents: any[] = []

  if (locationId) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [openOrders, activeTables, totalTables, salesAgg, tickets, events] = await Promise.all([
      prisma.order.count({ where: { table: { locationId }, status: { notIn: ['PAID', 'VOIDED'] } } }),
      prisma.table.count({ where: { locationId, status: { in: ['ACTIVE', 'PAYING'] } } }),
      prisma.table.count({ where: { locationId } }),
      prisma.payment.aggregate({
        _sum: { total: true },
        where: { order: { table: { locationId } }, status: 'COMPLETED', createdAt: { gte: today } },
      }),
      prisma.kdsTicket.findMany({
        where: { order: { table: { locationId } }, status: { in: ['READY', 'SERVED'] }, readyAt: { not: null, gte: today } },
        select: { createdAt: true, readyAt: true },
      }),
      prisma.orderEvent.findMany({
        where: { order: { table: { locationId } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { order: { select: { table: { select: { name: true } } } } },
      }),
    ])

    stats.openOrders  = openOrders
    stats.activeTables = activeTables
    stats.totalTables  = totalTables
    stats.todaySales   = Number(salesAgg._sum.total ?? 0)
    recentEvents       = events

    if (tickets.length > 0) {
      const totalMs = tickets.reduce((s, t) => s + (new Date(t.readyAt!).getTime() - new Date(t.createdAt).getTime()), 0)
      stats.avgKds = Number((totalMs / tickets.length / 60000).toFixed(1))
    }
  }

  const kpis = [
    { label: 'Open Orders',   value: stats.openOrders,  icon: '🧾', color: '#FF9F0A' },
    { label: 'Active Tables', value: `${stats.activeTables}/${stats.totalTables}`, icon: '🍽️', color: '#30D158' },
    { label: "Today's Sales", value: `$${stats.todaySales.toFixed(0)}`, icon: '💰', color: '#30D158' },
    { label: 'Avg KDS Time',  value: `${stats.avgKds}m`, icon: '⏱️', color: stats.avgKds > 15 ? '#FF453A' : '#30D158' },
  ]

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#8E8E93' }}>Good day,</p>
        <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: '#E5E5EA' }}>{user.name}</h1>
        <span style={{ fontSize: 11, color: '#5b45f5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user.role}</span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background: '#1C1C1E', borderRadius: 14, padding: '16px 14px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{kpi.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Operations feed */}
      <div style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#E5E5EA' }}>Live Operations Feed</h3>
        {recentEvents.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: '#8E8E93' }}>No activity yet today.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentEvents.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5b45f5', marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#E5E5EA', lineHeight: 1.4 }}>
                    {ev.eventType.replace(/\./g, ' → ')} · {ev.order.table.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>
                    {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
