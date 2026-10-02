import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Team | Resto AI Manager' }

const ROLE_COLOR: Record<string, string> = {
  OWNER:   '#FF9F0A',
  MANAGER: '#BF5AF2',
  SERVER:  '#30D158',
  KITCHEN: '#32ADE6',
}

export default async function MobileTeamPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const employee = await prisma.employee.findFirst({ where: { userId: session.user.id, isActive: true } })
  let locationId = employee?.locationId
  if (!locationId) {
    const loc = await prisma.location.findFirst({ where: { restaurantId: session.user.restaurantId } })
    locationId = loc?.id
  }

  const employees = locationId
    ? await prisma.employee.findMany({
        where: { locationId, isActive: true },
        include: {
          user: { select: { name: true, role: true } },
          shifts: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: { id: true, clockIn: true, role: true },
          },
        },
        orderBy: { user: { name: 'asc' } },
      })
    : []

  // Pending shift trade requests
  const pendingTrades = locationId
    ? await prisma.shiftTradeRequest.findMany({
        where: {
          shift: { locationId },
          status: 'PENDING_MANAGER',
        },
        include: {
          requester: { include: { user: { select: { name: true } } } },
          targetEmployee: { include: { user: { select: { name: true } } } },
          shift: { select: { scheduledStart: true, scheduledEnd: true, role: true } },
        },
        take: 5,
      })
    : []

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: '#E5E5EA' }}>Team</h1>

      {/* Pending approvals */}
      {pendingTrades.length > 0 && (
        <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#5b45f5', marginBottom: 8 }}>
            🔔 {pendingTrades.length} Shift Trade{pendingTrades.length > 1 ? 's' : ''} Need Approval
          </div>
          {pendingTrades.map((trade) => (
            <div key={trade.id} style={{ fontSize: 12, color: '#E5E5EA', marginBottom: 4 }}>
              <strong>{trade.requester.user.name}</strong> → {trade.targetEmployee?.user.name ?? 'Open Pool'} ·{' '}
              {trade.shift.scheduledStart
                ? new Date(trade.shift.scheduledStart).toLocaleDateString([], { month: 'short', day: 'numeric' })
                : 'Date TBD'}
            </div>
          ))}
          <a href="/dashboard/team" style={{ fontSize: 11, color: '#5b45f5', textDecoration: 'none', fontWeight: 600, marginTop: 6, display: 'block' }}>
            Review in Dashboard →
          </a>
        </div>
      )}

      {/* Active staff */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {employees.map((emp) => {
          const activeShift = emp.shifts[0]
          const minsClocked = activeShift?.clockIn
            ? Math.round((Date.now() - new Date(activeShift.clockIn).getTime()) / 60000)
            : null

          return (
            <div key={emp.id} style={{ background: '#1C1C1E', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#E5E5EA', marginBottom: 3 }}>{emp.user.name}</div>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: ROLE_COLOR[emp.user.role] ?? '#8E8E93',
                  background: `${ROLE_COLOR[emp.user.role] ?? '#8E8E93'}18`,
                  padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.3px',
                }}>
                  {emp.user.role}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {activeShift ? (
                  <>
                    <div style={{ fontSize: 12, color: '#30D158', fontWeight: 600 }}>● Clocked In</div>
                    <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{minsClocked}m on shift</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: '#48484A' }}>Off Shift</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {employees.length === 0 && (
        <p style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
          No team members found for this location.
        </p>
      )}
    </div>
  )
}
