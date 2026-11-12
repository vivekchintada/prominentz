import { prisma } from '@/lib/prisma'
import { getEffectiveTaxRate, getPrintSettings } from '@/lib/settings-helpers'
import { getRestaurantAccessStatus } from '@/lib/subscription-status'

/** Everything the Settings board shows, read-only. Changes happen in the forms below it. */
export interface SettingsBoard {
  profile: { label: string; value: string; wide?: boolean }[]
  plan: { tier: string; status: string; detail: string }
  devices: { name: string; detail: string; on: boolean }[]
  people: { total: number; list: { id: string; name: string; role: string }[] }
  bills: { name: string; detail: string; on: boolean }[]
  apps: { name: string; detail: string; on: boolean }[]
}

export const EMPTY_SETTINGS_BOARD: SettingsBoard = {
  profile: [],
  plan: { tier: 'STARTER', status: '', detail: '' },
  devices: [],
  people: { total: 0, list: [] },
  bills: [],
  apps: [],
}

const ROLE: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', SERVER: 'Floor', KITCHEN: 'Kitchen' }
const ROLE_ORDER = ['OWNER', 'MANAGER', 'SERVER', 'KITCHEN']

export async function getSettingsBoard(restaurantId: string, locationId: string | null, currency: string, timezone: string): Promise<SettingsBoard> {
  const [restaurant, location, taxRate, print, access, users, stations, providers, online] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, planTier: true, settings: true, stripeConnectAccountId: true, stripeChargesEnabled: true },
    }),
    locationId
      ? prisma.location.findUnique({ where: { id: locationId }, select: { name: true, address: true, phone: true, stripeReaderId: true } })
      : Promise.resolve(null),
    getEffectiveTaxRate(restaurantId),
    getPrintSettings(restaurantId),
    getRestaurantAccessStatus(restaurantId).catch(() => null),
    prisma.user.findMany({ where: { restaurantId, isActive: true }, select: { id: true, name: true, role: true } }),
    locationId ? prisma.kdsStationConfig.findMany({ where: { locationId }, select: { name: true, isActive: true } }) : Promise.resolve([]),
    locationId ? prisma.deliveryProvider.findMany({ where: { locationId }, orderBy: { name: 'asc' }, select: { name: true, isActive: true } }) : Promise.resolve([]),
    locationId ? prisma.onlineOrderingConfig.findUnique({ where: { locationId } }) : Promise.resolve(null),
  ])

  const settings = (restaurant?.settings as Record<string, unknown> | null) ?? {}
  const store = (settings.store ?? {}) as Record<string, unknown>
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const address =
    [text(store.address1), text(store.address2), text(store.city), text(store.state), text(store.pincode), text(store.country)].filter(Boolean).join(', ') ||
    location?.address ||
    null

  const profile: SettingsBoard['profile'] = [
    { label: 'Restaurant name', value: text(store.name) ?? restaurant?.name ?? '–' },
    { label: 'Outlet', value: location?.name ?? '–' },
    { label: 'Phone', value: text(store.phone) ?? location?.phone ?? 'Not set' },
    { label: 'Email for reports', value: text(store.email) ?? 'Not set' },
    { label: 'Currency', value: currency },
    { label: 'Tax on bills', value: `${+(taxRate * 100).toFixed(2)}%` },
    { label: 'Time zone', value: timezone },
    { label: 'Address', value: address ?? 'Not set', wide: true },
  ]

  let status = 'Active'
  let detail = 'Paid and up to date'
  if (access) {
    if (access.isPastDue) {
      status = 'Payment failed'
      detail = 'Update your payment method to keep access'
    } else if (access.isActive) {
      status = 'Active'
      detail = `Billed through ${access.gateway === 'DODO' ? 'Dodo Payments' : 'Stripe'}`
    } else if (access.isTrialing) {
      status = 'Free trial'
      detail = `${access.daysLeftInTrial} day${access.daysLeftInTrial === 1 ? '' : 's'} left`
    } else if (access.isExpired) {
      status = 'Trial ended'
      detail = 'Choose a plan to keep using Prominentz'
    }
  }

  const activeStations = stations.filter((s) => s.isActive)
  const devices: SettingsBoard['devices'] = [
    {
      name: 'Kitchen screens',
      detail: activeStations.length ? activeStations.map((s) => s.name).join(', ') : 'No stations set up',
      on: activeStations.length > 0,
    },
    { name: 'Card reader', detail: location?.stripeReaderId ? 'Stripe Terminal paired' : 'Not paired', on: Boolean(location?.stripeReaderId) },
    { name: 'Receipt printing', detail: print.enablePrint ? String(print.pageSize ?? 'Thermal') : 'Switched off', on: Boolean(print.enablePrint) },
  ]

  const bills: SettingsBoard['bills'] = [
    { name: 'Print receipts', detail: print.enablePrint ? String(print.pageSize ?? 'Thermal') : 'Off', on: Boolean(print.enablePrint) },
    { name: 'Store details on bill', detail: 'Name, address and phone', on: Boolean(print.showStoreDetails) },
    { name: 'Guest details on bill', detail: 'Name and phone when known', on: Boolean(print.showCustomerDetails) },
    {
      name: 'Online service charge',
      detail: online && Number(online.serviceChargePercent) > 0 ? `${Number(online.serviceChargePercent)}% on online orders` : 'None',
      on: Boolean(online && Number(online.serviceChargePercent) > 0),
    },
  ]

  const apps: SettingsBoard['apps'] = [
    {
      name: 'Stripe payments',
      detail: restaurant?.stripeChargesEnabled ? 'Card payments to your account' : restaurant?.stripeConnectAccountId ? 'Finish Stripe setup' : 'Not connected',
      on: Boolean(restaurant?.stripeChargesEnabled),
    },
    ...providers.map((p) => ({ name: p.name, detail: 'Menu and orders', on: p.isActive })),
    {
      name: 'Online ordering',
      detail: !online ? 'Not set up' : online.isPaused ? 'Paused' : 'Pickup, delivery and QR',
      on: Boolean(online?.isEnabled && !online.isPaused),
    },
  ]

  const sorted = [...users].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name))

  return {
    profile,
    plan: { tier: restaurant?.planTier ?? 'STARTER', status, detail },
    devices,
    people: { total: users.length, list: sorted.slice(0, 4).map((u) => ({ id: u.id, name: u.name, role: ROLE[u.role] ?? u.role })) },
    bills,
    apps,
  }
}
