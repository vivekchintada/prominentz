import { prisma } from '@/lib/prisma'
import { DAY_MS, localParts } from './time'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Everything the Customers · feedback board shows, from real records only. */
export interface CustomersBoard {
  monthName: string
  totalGuests: number
  guestsThisMonth: number
  newThisMonth: number
  returningThisMonth: number
  months: { key: string; label: string; value: number; current: boolean }[]
  topGuests: { id: string; name: string; visits: number; spend: number; note: string }[]
  winBack: { count: number; sample: { id: string; name: string; daysAway: number }[] }
  loyalty: { enabled: boolean; members: number; issued: number; redeemed: number } | null
}

export const EMPTY_CUSTOMERS_BOARD: CustomersBoard = {
  monthName: '',
  totalGuests: 0,
  guestsThisMonth: 0,
  newThisMonth: 0,
  returningThisMonth: 0,
  months: [],
  topGuests: [],
  winBack: { count: 0, sample: [] },
  loyalty: null,
}

const WIN_BACK_DAYS = 60

function guestNote(c: { source: string; tags: unknown; totalVisits: number }): string {
  const tags = Array.isArray(c.tags) ? (c.tags as unknown[]).filter((t) => typeof t === 'string') : []
  if (tags.length > 0) return tags.slice(0, 2).join(' · ')
  switch (c.source) {
    case 'QR_TABLE':
      return 'orders on QR'
    case 'ONLINE':
    case 'DELIVERY':
      return 'orders online'
    case 'PHONE':
      return 'books by phone'
    default:
      return 'dines in'
  }
}

export async function getCustomersBoard(restaurantId: string, todayStart: Date, timezone: string): Promise<CustomersBoard> {
  const now = new Date()
  const today = localParts(now, timezone).day
  const [y, mo, d] = today.split('-').map(Number)
  const monthStart = new Date(todayStart.getTime() - (d - 1) * DAY_MS)
  const winBackBefore = new Date(now.getTime() - WIN_BACK_DAYS * DAY_MS)

  // Six calendar months, oldest first
  const keys: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const idx = y * 12 + (mo - 1) - i
    keys.push({ key: `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`, label: MONTHS[idx % 12] })
  }
  const sixStart = new Date(Date.UTC(Math.floor((y * 12 + (mo - 1) - 5) / 12), (y * 12 + (mo - 1) - 5) % 12, 1) - DAY_MS)

  const [total, thisMonth, visits, top, winBackCount, winBackSample, config, members, issued, redeemed] = await Promise.all([
    prisma.customer.count({ where: { restaurantId } }),
    prisma.customer.findMany({ where: { restaurantId, lastVisitAt: { gte: monthStart } }, select: { createdAt: true } }),
    prisma.order.findMany({
      where: { customerId: { not: null }, customer: { restaurantId }, createdAt: { gte: sixStart }, status: { not: 'VOIDED' } },
      select: { customerId: true, createdAt: true },
    }),
    prisma.customer.findMany({
      where: { restaurantId, totalVisits: { gt: 0 } },
      orderBy: [{ lifetimeSpend: 'desc' }, { totalVisits: 'desc' }],
      take: 4,
      select: { id: true, name: true, totalVisits: true, lifetimeSpend: true, tags: true, source: true },
    }),
    prisma.customer.count({ where: { restaurantId, totalVisits: { gte: 3 }, lastVisitAt: { lt: winBackBefore } } }),
    prisma.customer.findMany({
      where: { restaurantId, totalVisits: { gte: 3 }, lastVisitAt: { lt: winBackBefore } },
      orderBy: { lifetimeSpend: 'desc' },
      take: 3,
      select: { id: true, name: true, lastVisitAt: true },
    }),
    prisma.loyaltyConfig.findUnique({ where: { restaurantId }, select: { isEnabled: true } }),
    prisma.customer.count({ where: { restaurantId, pointsBalance: { gt: 0 } } }),
    prisma.pointsLedger.aggregate({ _sum: { pointsChange: true }, where: { customer: { restaurantId }, createdAt: { gte: monthStart }, pointsChange: { gt: 0 } } }),
    prisma.loyaltyRedemption.aggregate({ _sum: { pointsRedeemed: true }, where: { customer: { restaurantId }, createdAt: { gte: monthStart } } }),
  ])

  // Distinct guests per month, from orders that were tied to a guest profile
  const perMonth = new Map<string, Set<string>>()
  for (const v of visits) {
    const key = localParts(v.createdAt, timezone).day.slice(0, 7)
    const set = perMonth.get(key) ?? new Set<string>()
    set.add(v.customerId!)
    perMonth.set(key, set)
  }

  const newThisMonth = thisMonth.filter((c) => c.createdAt >= monthStart).length

  return {
    monthName: MONTHS_LONG[mo - 1],
    totalGuests: total,
    guestsThisMonth: thisMonth.length,
    newThisMonth,
    returningThisMonth: thisMonth.length - newThisMonth,
    months: keys.map((k, i) => ({ ...k, value: perMonth.get(k.key)?.size ?? 0, current: i === keys.length - 1 })),
    topGuests: top.map((c) => ({ id: c.id, name: c.name, visits: c.totalVisits, spend: Number(c.lifetimeSpend), note: guestNote(c) })),
    winBack: {
      count: winBackCount,
      sample: winBackSample.map((c) => ({
        id: c.id,
        name: c.name,
        daysAway: c.lastVisitAt ? Math.floor((now.getTime() - c.lastVisitAt.getTime()) / DAY_MS) : WIN_BACK_DAYS,
      })),
    },
    loyalty: config
      ? { enabled: config.isEnabled, members, issued: issued._sum.pointsChange ?? 0, redeemed: redeemed._sum.pointsRedeemed ?? 0 }
      : null,
  }
}
