import crypto from 'crypto'

/**
 * Bearer tokens for the mobile app: mobile_jwt_<userId>_<issuedAtMs>_<hmac>.
 *
 * The HMAC covers the user's current password hash, so changing or resetting the password
 * revokes every token issued before it. Tokens expire after 30 days.
 */

const PREFIX = 'mobile_jwt_'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function sign(secret: string, userId: string, issuedAt: string, passwordHash: string): string {
  return crypto.createHmac('sha256', secret).update(`${userId}_${issuedAt}_${passwordHash}`).digest('hex')
}

export function issueMobileToken(user: { id: string; passwordHash: string }, secret: string): string {
  const issuedAt = String(Date.now())
  return `${PREFIX}${user.id}_${issuedAt}_${sign(secret, user.id, issuedAt, user.passwordHash)}`
}

/** Splits a token without trusting it. The caller must still call verifyMobileToken. */
export function parseMobileToken(token: string): { userId: string; issuedAt: string; signature: string } | null {
  if (!token.startsWith(PREFIX)) return null
  const [userId, issuedAt, signature, ...rest] = token.slice(PREFIX.length).split('_')
  if (!userId || !issuedAt || !signature || rest.length > 0) return null
  return { userId, issuedAt, signature }
}

export function verifyMobileToken(
  parsed: { userId: string; issuedAt: string; signature: string },
  user: { id: string; passwordHash: string },
  secret: string
): boolean {
  const issuedAt = Number(parsed.issuedAt)
  if (!Number.isFinite(issuedAt)) return false
  const age = Date.now() - issuedAt
  if (age < 0 || age > MAX_AGE_MS) return false

  const expected = Buffer.from(sign(secret, user.id, parsed.issuedAt, user.passwordHash), 'utf8')
  const supplied = Buffer.from(parsed.signature, 'utf8')
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)
}
