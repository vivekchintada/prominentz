import { TableStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { publishEvent, EVENTS } from '@/lib/redis'

/**
 * Atomically updates a table's status and fires the
 * `table.status.changed` event onto the Redis bus.
 *
 * Called by:
 *   - POST /api/orders   → EMPTY → ACTIVE
 *   - DELETE /api/orders/:id (void) → ACTIVE → EMPTY
 *   - POST /api/orders/:id/send → no table change, but reused elsewhere
 */
export async function setTableStatus(
  tableId:  string,
  status:   TableStatus,
  actorId?: string,
) {
  const table = await prisma.table.update({
    where: { id: tableId },
    data:  { status },
  })

  await publishEvent(EVENTS.TABLE_STATUS_CHANGED, {
    tableId,
    status,
    actorId: actorId ?? null,
  })

  return table
}
