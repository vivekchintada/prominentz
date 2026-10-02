import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// ─── Event Publisher ─────────────────────────────────────────────────────────
// locationId is included in every event so subscribers can filter cross-location noise.
export async function publishEvent(
  event: string,
  payload: Record<string, unknown>,
  locationId?: string,
) {
  await redis.publish(
    'resto:events',
    JSON.stringify({ event, payload: { ...payload, _locationId: locationId }, ts: Date.now() }),
  )
}

// ─── Typed Event Names (Phase 1) ─────────────────────────────────────────────
export const EVENTS = {
  MENU_ITEM_UPDATED:        'menu.item.updated',
  MENU_ITEM_86D:            'menu.item.86d',
  ORDER_CREATED:            'order.created',
  ORDER_MODIFIED:           'order.modified',
  ORDER_SENT_KITCHEN:       'order.sent_to_kitchen',
  TICKET_STATUS:            'ticket.status.updated',
  TICKET_COMPLETED:         'ticket.completed',
  PAYMENT_PROCESSED:        'payment.processed',
  PAYMENT_VOIDED:           'payment.voided',
  TABLE_STATUS_CHANGED:     'table.status.changed',
  TABLE_NOTE_CHANGED:       'table.note.changed',
  SERVER_KPI_UPDATED:       'server.kpi.updated',
  DELIVERY_ORDER_RECEIVED:  'delivery.order.received', // Phase D — external delivery platform orders
  SHIFT_PUBLISHED:          'shift.published',
  SWAP_REQUESTED:           'swap.requested',
  SWAP_RESOLVED:            'swap.resolved',
  TASK_CREATED:             'task.created',
  TASK_RESOLVED:            'task.resolved',
  ORDER_FIRED:              'order.fired',
  ORDER_ITEM_STATUS:        'orderitem.status_changed',
  TICKET_READY_TO_SERVE:    'ticket.ready_to_serve',
  ATTENDANCE_FLAGGED:       'attendance.flagged',
  ATTENDANCE_CLOCK:         'attendance.clock',
  TABLE_ASSISTANCE_REQUESTED:    'table.assistance.requested',
  TABLE_ASSISTANCE_ACKNOWLEDGED: 'table.assistance.acknowledged',
} as const


export type RestoEvent = typeof EVENTS[keyof typeof EVENTS]
