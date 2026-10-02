import { prisma } from '@/lib/prisma'

export type AuditAction =
  | 'VOID_PAYMENT'
  | 'EDIT_MENU_ITEM'
  | 'CREATE_USER'
  | 'CHANGE_USER_ROLE'
  | 'VOID_ORDER'
  | 'COMP_ORDER'
  | 'DELETE_MENU_ITEM'
  | 'CREATE_LOCATION'
  | 'EDIT_SETTINGS'
  | 'PLAN_UPGRADED'
  | 'PLAN_DOWNGRADED'

export type AuditTargetType = 'Order' | 'Payment' | 'MenuItem' | 'User' | 'Location' | 'Restaurant'

export interface AuditEventParams {
  restaurantId: string
  actorId: string
  actorName?: string | null
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ipAddress?: string
}

/**
 * Appends an immutable audit log entry.
 * Call this from any mutation route after the DB change is committed.
 * Never throws — audit failures must not block the primary operation.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: params.restaurantId,
        actorId: params.actorId,
        actorName: params.actorName || 'Staff User',
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        before: (params.before as any) ?? undefined,
        after: (params.after as any) ?? undefined,
        ipAddress: params.ipAddress ?? null,
      },
    })
  } catch (err) {
    // Audit failures must never crash the primary request
    console.error('[AuditLog] Failed to write audit event:', err)
  }
}
