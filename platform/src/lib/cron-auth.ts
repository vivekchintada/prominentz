import { timingSafeEqual } from 'crypto'

/**
 * True when the request carries `Authorization: Bearer <CRON_SECRET>`, which is what
 * Vercel Cron sends. Always false when CRON_SECRET is not configured.
 */
export function isAuthorizedCron(req: { headers: { get(name: string): string | null } }): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const supplied = Buffer.from(req.headers.get('authorization') || '', 'utf8')
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
