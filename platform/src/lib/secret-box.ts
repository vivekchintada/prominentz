import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

/**
 * Encrypts secrets we must store for later use (a restaurant's Stripe secret key and webhook
 * signing secret). AES-256-GCM, keyed from PAYMENT_KEYS_ENCRYPTION_KEY.
 *
 * Format: "v1:<iv>:<tag>:<ciphertext>", each part base64url.
 * Rotating PAYMENT_KEYS_ENCRYPTION_KEY makes stored secrets unreadable; owners would re-enter keys.
 */

const VERSION = 'v1'

function key(): Buffer {
  const raw = process.env.PAYMENT_KEYS_ENCRYPTION_KEY
  if (!raw || raw.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PAYMENT_KEYS_ENCRYPTION_KEY must be set (at least 32 characters) to store payment keys.')
    }
    // Local development only: a fixed key so saved test keys survive restarts.
    return createHash('sha256').update('prominentz-dev-only-payment-keys').digest()
  }
  return createHash('sha256').update(raw).digest()
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join(':')
}

export function openSecret(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(':')
  if (version !== VERSION || !iv || !tag || !data) throw new Error('Stored secret has an unknown format')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

/** True when the encryption key is usable in this environment. */
export function secretBoxReady(): boolean {
  try {
    key()
    return true
  } catch {
    return false
  }
}
