import type { FulfilmentType, OrderSource, OrderStatus } from '@prisma/client'

export type Channel = 'dine' | 'qr' | 'delivery' | 'pickup'

export const CHANNEL_LABEL: Record<Channel, string> = {
  dine: 'Dine-in',
  qr: 'QR',
  delivery: 'Delivery',
  pickup: 'Takeaway',
}
export const CHANNELS: Channel[] = ['dine', 'qr', 'delivery', 'pickup']

export const QR_SOURCES: OrderSource[] = ['QR_TABLE', 'QR_DINE_IN']
export const DELIVERY_SOURCES: OrderSource[] = ['DELIVERY_DOORDASH', 'DELIVERY_UBEREATS', 'DELIVERY_OTHER', 'WEB_DELIVERY']
export const ONLINE_SOURCES: OrderSource[] = [...DELIVERY_SOURCES, 'WEB_PICKUP']

/** Which of the four channels an order came through. */
export function channelOf(source: OrderSource, fulfilment: FulfilmentType | null): Channel {
  if (QR_SOURCES.includes(source)) return 'qr'
  if (DELIVERY_SOURCES.includes(source) || fulfilment === 'DELIVERY') return 'delivery'
  if (source === 'WEB_PICKUP' || fulfilment === 'PICKUP') return 'pickup'
  return 'dine'
}

/** Name of the app or channel an order came from, for list rows. */
export function sourceName(source: OrderSource): string {
  switch (source) {
    case 'DELIVERY_DOORDASH':
      return 'DoorDash'
    case 'DELIVERY_UBEREATS':
      return 'Uber Eats'
    case 'DELIVERY_OTHER':
      return 'Delivery app'
    case 'WEB_PICKUP':
      return 'Online pickup'
    case 'WEB_DELIVERY':
      return 'Own delivery'
    case 'QR_TABLE':
    case 'QR_DINE_IN':
      return 'QR'
    default:
      return 'POS'
  }
}

/** Short order reference: the public number when there is one, else the end of the id. */
export function orderRef(o: { id: string; publicOrderNumber: string | null }): string {
  return `#${o.publicOrderNumber ?? o.id.slice(-4).toUpperCase()}`
}

export type BadgeTone = 'ink' | 'accent' | 'outline' | 'quiet'

/** Plain-language status and badge style for an order. */
export function orderStatusBadge(status: OrderStatus, onlineStatus?: string | null): { label: string; tone: BadgeTone } {
  if (onlineStatus === 'PENDING_ACCEPTANCE') return { label: 'Needs accepting', tone: 'accent' }
  if (onlineStatus === 'OUT_FOR_DELIVERY') return { label: 'Out for delivery', tone: 'ink' }
  switch (status) {
    case 'OPEN':
      return { label: 'New', tone: 'outline' }
    case 'SENT_TO_KITCHEN':
      return { label: 'In kitchen', tone: 'outline' }
    case 'PARTIALLY_READY':
      return { label: 'Part ready', tone: 'ink' }
    case 'READY':
      return { label: 'Ready', tone: 'ink' }
    case 'HOLD':
      return { label: 'On hold', tone: 'outline' }
    case 'PAID':
      return { label: 'Paid', tone: 'quiet' }
    case 'VOIDED':
      return { label: 'Voided', tone: 'quiet' }
    default:
      return { label: status, tone: 'outline' }
  }
}

export function badgeClass(tone: BadgeTone): string {
  if (tone === 'ink') return 'bz-badge bz-badge--ink'
  if (tone === 'accent') return 'bz-badge bz-badge--accent'
  if (tone === 'quiet') return 'bz-badge bz-badge--quiet'
  return 'bz-badge'
}
