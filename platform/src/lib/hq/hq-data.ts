import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCurrency } from '@/lib/money'
import { PRICING } from '@/lib/pricing'
import type { PlanTier } from '@/lib/plans'
import { accessStatusFrom, TRIAL_DAYS } from '@/lib/subscription-status'
import { isPlatformAdmin } from './platform-admin'

/**
 * Data for the Prominentz HQ console. Everything here reads across tenants, so
 * every page calls requirePlatformAdmin() itself; layouts are not enough because
 * a page's data can be fetched on client navigation without the layout re-running.
 */

export async function requirePlatformAdmin() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  // Not found rather than forbidden: the console's existence is not advertised.
  if (!isPlatformAdmin(session.user.email)) notFound()
  return session.user
}

const DAY = 24 * 60 * 60 * 1000

export type TenantStatus = 'paying' | 'past_due' | 'trial' | 'expired' | 'cancelled'
export type Health = 'healthy' | 'at_risk' | 'quiet' | 'converting' | 'stuck' | 'early' | 'lapsed'

export interface Tenant {
  id: string
  name: string
  city: string | null
  planTier: PlanTier
  createdAt: Date
  currency: string
  status: TenantStatus
  gateway: string
  trialDay: number | null
  trialEndsAt: Date
  daysLeftInTrial: number
  /** List price per month in the tenant's billing currency, when paying. */
  monthlyPrice: number
  priceCurrency: 'INR' | 'USD'
  owner: { name: string; email: string } | null
  phone: string | null
  staff: number
  locations: number
  tables: number
  menuItems: number
  orders: { total: number; last30: number; last7: number; prev23: number; lastAt: Date | null }
  health: Health
  stripeCustomerId: string | null
}

interface OrderAgg {
  rid: string
  total: number
  last30: number
  last7: number
  lastAt: Date | null
}

function cityOf(address: string | null | undefined): string | null {
  if (!address) return null
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  // "12 MG Road, Indiranagar, Bengaluru 560038" → "Bengaluru"
  const pick = parts.length >= 2 ? parts[parts.length - 1] : parts[0]
  return pick?.replace(/\b\d{4,}\b/g, '').trim() || null
}

function statusOf(access: ReturnType<typeof accessStatusFrom>, settings: Record<string, unknown>): TenantStatus {
  if (access.isActive) return 'paying'
  if (access.isPastDue) return 'past_due'
  if (access.isTrialing) return 'trial'
  const cancelled = settings.stripeSubscriptionStatus === 'CANCELLED' || ['CANCELLED', 'EXPIRED'].includes(String(settings.dodoSubscriptionStatus))
  return cancelled ? 'cancelled' : 'expired'
}

function healthOf(t: Omit<Tenant, 'health'>): Health {
  const { orders } = t
  if (t.status === 'trial') {
    if (orders.total >= 20 && t.menuItems > 0 && t.tables > 0) return 'converting'
    if ((t.trialDay ?? 0) >= 3 && (orders.total === 0 || orders.last7 === 0)) return 'stuck'
    return 'early'
  }
  if (t.status === 'past_due') return 'at_risk'
  if (t.status === 'paying') {
    if (orders.last7 === 0) return 'quiet'
    const recent = orders.last7 / 7
    const before = orders.prev23 / 23
    if (before >= 2 && recent < before * 0.5) return 'at_risk'
    return 'healthy'
  }
  return 'lapsed'
}

/** One row per restaurant with everything the HQ boards need, loaded in a handful of grouped queries. */
export const loadTenants = cache(async (): Promise<Tenant[]> => {
  const now = Date.now()
  const since30 = new Date(now - 30 * DAY)
  const since7 = new Date(now - 7 * DAY)

  const [restaurants, owners, staff, locations, tables, items, orders] = await Promise.all([
    prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, planTier: true, createdAt: true, settings: true, stripeCustomerId: true },
    }),
    prisma.user.findMany({ where: { role: 'OWNER' }, orderBy: { createdAt: 'asc' }, select: { restaurantId: true, name: true, email: true } }),
    prisma.user.groupBy({ by: ['restaurantId'], where: { isActive: true }, _count: { _all: true } }),
    prisma.location.findMany({ orderBy: { createdAt: 'asc' }, select: { restaurantId: true, address: true, phone: true } }),
    prisma.$queryRaw<{ rid: string; n: number }[]>`
      SELECT l."restaurantId" AS rid, COUNT(*)::int AS n
      FROM "Table" t JOIN "Location" l ON l.id = t."locationId"
      GROUP BY l."restaurantId"`,
    prisma.$queryRaw<{ rid: string; n: number }[]>`
      SELECT c."restaurantId" AS rid, COUNT(*)::int AS n
      FROM "MenuItem" i JOIN "MenuCategory" c ON c.id = i."categoryId"
      GROUP BY c."restaurantId"`,
    prisma.$queryRaw<OrderAgg[]>`
      SELECT l."restaurantId" AS rid,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE o."createdAt" >= ${since30})::int AS last30,
             COUNT(*) FILTER (WHERE o."createdAt" >= ${since7})::int AS last7,
             MAX(o."createdAt") AS "lastAt"
      FROM "Order" o
      JOIN "Table" t ON t.id = o."tableId"
      JOIN "Location" l ON l.id = t."locationId"
      WHERE o.status <> 'VOIDED'
      GROUP BY l."restaurantId"`,
  ])

  const ownerBy = new Map<string, { name: string; email: string }>()
  for (const o of owners) if (!ownerBy.has(o.restaurantId)) ownerBy.set(o.restaurantId, { name: o.name, email: o.email })
  const staffBy = new Map(staff.map((s) => [s.restaurantId, s._count._all]))
  const locBy = new Map<string, { count: number; address: string | null; phone: string | null }>()
  for (const l of locations) {
    const cur = locBy.get(l.restaurantId)
    if (cur) cur.count += 1
    else locBy.set(l.restaurantId, { count: 1, address: l.address, phone: l.phone })
  }
  const tablesBy = new Map(tables.map((t) => [t.rid, Number(t.n)]))
  const itemsBy = new Map(items.map((t) => [t.rid, Number(t.n)]))
  const ordersBy = new Map(orders.map((o) => [o.rid, o]))

  return restaurants.map((r) => {
    const settings = (r.settings as Record<string, unknown>) || {}
    const store = (settings.store as Record<string, unknown>) || {}
    const access = accessStatusFrom(r.createdAt, settings)
    const status = statusOf(access, settings)
    const currency = normalizeCurrency(store.currency)
    const tier = (r.planTier as PlanTier) || 'STARTER'
    const inr = currency === 'INR'
    const o = ordersBy.get(r.id)
    const loc = locBy.get(r.id)
    const day = Math.floor((now - r.createdAt.getTime()) / DAY) + 1
    const base: Omit<Tenant, 'health'> = {
      id: r.id,
      name: r.name,
      city: cityOf(loc?.address),
      planTier: tier,
      createdAt: r.createdAt,
      currency,
      status,
      gateway: access.gateway,
      trialDay: status === 'trial' ? Math.min(day, TRIAL_DAYS) : null,
      trialEndsAt: access.trialEndsAt,
      daysLeftInTrial: access.daysLeftInTrial,
      monthlyPrice: status === 'paying' || status === 'past_due' ? (inr ? PRICING[tier].monthlyINR : PRICING[tier].monthly) : 0,
      priceCurrency: inr ? 'INR' : 'USD',
      owner: ownerBy.get(r.id) ?? null,
      phone: loc?.phone ?? null,
      staff: staffBy.get(r.id) ?? 0,
      locations: loc?.count ?? 0,
      tables: tablesBy.get(r.id) ?? 0,
      menuItems: itemsBy.get(r.id) ?? 0,
      orders: {
        total: o?.total ?? 0,
        last30: o?.last30 ?? 0,
        last7: o?.last7 ?? 0,
        prev23: (o?.last30 ?? 0) - (o?.last7 ?? 0),
        lastAt: o?.lastAt ? new Date(o.lastAt) : null,
      },
      stripeCustomerId: r.stripeCustomerId,
    }
    return { ...base, health: healthOf(base) }
  })
})

/** Monthly recurring revenue at list price, kept per currency (no exchange rate is invented). */
export function mrrOf(tenants: Tenant[]) {
  const billed = tenants.filter((t) => t.status === 'paying')
  const inr = billed.filter((t) => t.priceCurrency === 'INR')
  const usd = billed.filter((t) => t.priceCurrency === 'USD')
  return {
    inr: inr.reduce((s, t) => s + t.monthlyPrice, 0),
    usd: usd.reduce((s, t) => s + t.monthlyPrice, 0),
    inrCount: inr.length,
    usdCount: usd.length,
  }
}

/** Sign-ups per calendar month for the last n months, oldest first. */
export function signupsByMonth(tenants: Tenant[], months = 8) {
  const out: { key: string; label: string; n: number }[] = []
  const d = new Date()
  d.setUTCDate(1)
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1))
    out.push({ key: `${m.getUTCFullYear()}-${m.getUTCMonth()}`, label: m.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }), n: 0 })
  }
  const idx = new Map(out.map((o, i) => [o.key, i]))
  for (const t of tenants) {
    const i = idx.get(`${t.createdAt.getUTCFullYear()}-${t.createdAt.getUTCMonth()}`)
    if (i !== undefined) out[i].n += 1
  }
  return out
}

/** Everything the account page shows for one restaurant. */
export async function loadAccount(id: string) {
  const tenants = await loadTenants()
  const tenant = tenants.find((t) => t.id === id)
  if (!tenant) return null

  const since = new Date()
  since.setUTCMonth(since.getUTCMonth() - 5, 1)
  since.setUTCHours(0, 0, 0, 0)

  const [monthly, activity, locations] = await Promise.all([
    prisma.$queryRaw<{ m: Date; n: number }[]>`
      SELECT date_trunc('month', o."createdAt") AS m, COUNT(*)::int AS n
      FROM "Order" o
      JOIN "Table" t ON t.id = o."tableId"
      JOIN "Location" l ON l.id = t."locationId"
      WHERE l."restaurantId" = ${id} AND o."createdAt" >= ${since} AND o.status <> 'VOIDED'
      GROUP BY 1 ORDER BY 1`,
    prisma.auditLog.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, action: true, actorName: true, targetType: true, createdAt: true },
    }),
    prisma.location.findMany({ where: { restaurantId: id }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, address: true } }),
  ])

  const months: { label: string; n: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setUTCMonth(d.getUTCMonth() - i, 1)
    const hit = monthly.find((r) => new Date(r.m).getUTCFullYear() === d.getUTCFullYear() && new Date(r.m).getUTCMonth() === d.getUTCMonth())
    months.push({ label: d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }), n: hit ? Number(hit.n) : 0 })
  }

  return { tenant, months, activity, locations }
}

/** Sales enquiries from the website, newest first. */
export async function loadLeads(limit = 50) {
  return prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, name: true, email: true, phone: true, restaurantName: true, locations: true, currentPos: true, message: true, source: true, createdAt: true },
  })
}

export const STATUS_LABEL: Record<TenantStatus, string> = {
  paying: 'Paying',
  past_due: 'Payment failed',
  trial: 'On trial',
  expired: 'Trial ended',
  cancelled: 'Cancelled',
}

export const HEALTH_BADGE: Record<Health, { label: string; tone: 'ink' | 'accent' | 'outline' | 'quiet' }> = {
  healthy: { label: 'Healthy', tone: 'ink' },
  at_risk: { label: 'At risk', tone: 'accent' },
  quiet: { label: 'No orders 7d', tone: 'outline' },
  converting: { label: 'Converting', tone: 'ink' },
  stuck: { label: 'Stuck', tone: 'accent' },
  early: { label: 'Early', tone: 'outline' },
  lapsed: { label: 'Lapsed', tone: 'quiet' },
}
