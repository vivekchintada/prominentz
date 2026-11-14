import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { openSecret } from '@/lib/secret-box'

/**
 * Diner payments run on each restaurant's OWN Stripe account, using the secret key the owner
 * saved in Settings → Payments. Prominentz never holds diner money and has no Stripe account of
 * its own in this flow: every call below is made with the restaurant's key.
 *
 * Local development: a restaurant with no saved key gets `null` (simulated payments), so the POS
 * works without Stripe. In production a missing key is an error.
 */

export const STRIPE_API_VERSION = '2023-10-16' as any

export class PaymentsNotConnectedError extends Error {
  status = 409
  constructor() {
    super('Card payments are not set up yet. The owner needs to add their Stripe key in Settings → Payments.')
  }
}

export function stripeClientForKey(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2 })
}

/** Simulated card payments are allowed only outside production. */
export function paymentsSimulationAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export type KeyMode = 'live' | 'test'

/** sk_live_ / rk_live_ → live, sk_test_ / rk_test_ → test, anything else → null. */
export function stripeKeyMode(secretKey: string): KeyMode | null {
  const m = /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.exec(secretKey.trim())
  return m ? (m[2] as KeyMode) : null
}

const clientCache = new Map<string, { sealed: string; client: Stripe }>()

async function loadKeys(restaurantId: string) {
  return prisma.restaurantStripeKeys.findUnique({
    where: { restaurantId },
    select: { secretKeyEnc: true, webhookSecretEnc: true, mode: true, country: true },
  })
}

function clientFor(restaurantId: string, sealed: string): Stripe {
  const cached = clientCache.get(restaurantId)
  if (cached && cached.sealed === sealed) return cached.client
  const client = stripeClientForKey(openSecret(sealed))
  clientCache.set(restaurantId, { sealed, client })
  return client
}

/**
 * The restaurant's Stripe client for a new charge. `null` means simulated (development only).
 * Throws PaymentsNotConnectedError when the owner hasn't added a key.
 */
export async function requireRestaurantStripe(restaurantId: string | null | undefined): Promise<Stripe | null> {
  if (!restaurantId) {
    if (paymentsSimulationAllowed()) return null
    throw new PaymentsNotConnectedError()
  }
  const keys = await loadKeys(restaurantId)
  if (keys) return clientFor(restaurantId, keys.secretKeyEnc)
  if (paymentsSimulationAllowed()) return null
  throw new PaymentsNotConnectedError()
}

/** Like requireRestaurantStripe but never throws; `null` when there is no key. For refunds and lookups. */
export async function findRestaurantStripe(restaurantId: string | null | undefined): Promise<Stripe | null> {
  if (!restaurantId) return null
  const keys = await loadKeys(restaurantId)
  return keys ? clientFor(restaurantId, keys.secretKeyEnc) : null
}

/** The webhook signing secret Stripe gave us for this restaurant's endpoint, if any. */
export async function restaurantWebhookSecret(restaurantId: string): Promise<string | null> {
  const keys = await loadKeys(restaurantId)
  return keys?.webhookSecretEnc ? openSecret(keys.webhookSecretEnc) : null
}

/** Country of the restaurant's Stripe account, recorded when the key was saved. */
export async function restaurantStripeCountry(restaurantId: string): Promise<string | null> {
  return (await loadKeys(restaurantId))?.country ?? null
}

export function forgetRestaurantStripe(restaurantId: string) {
  clientCache.delete(restaurantId)
}

export function paymentErrorStatus(err: unknown): number {
  return err instanceof PaymentsNotConnectedError ? 409 : 500
}
