import { prisma } from '@/lib/prisma'
import { isMockStripe } from '@/lib/stripe'

/**
 * Stripe Connect helpers.
 *
 * Diner payments are "direct charges" on the restaurant's own Stripe account,
 * so the restaurant is the merchant of record and receives payouts directly.
 * The platform never holds diner money.
 */

export class PaymentsNotConnectedError extends Error {
  status = 409
  constructor() {
    super('Card payments are not set up yet. The owner needs to connect Stripe in Settings → Payments.')
  }
}

/** Returns the connected account id, or undefined in local mock mode. Throws if payments are not ready. */
export async function requireConnectedAccount(restaurantId: string | null | undefined): Promise<string | undefined> {
  if (isMockStripe()) return undefined
  if (!restaurantId) throw new PaymentsNotConnectedError()

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { stripeConnectAccountId: true, stripeChargesEnabled: true },
  })
  if (!restaurant?.stripeConnectAccountId || !restaurant.stripeChargesEnabled) {
    throw new PaymentsNotConnectedError()
  }
  return restaurant.stripeConnectAccountId
}

/** Like requireConnectedAccount, but never throws. Used for refunds/lookups on existing charges. */
export async function findConnectedAccount(restaurantId: string | null | undefined): Promise<string | undefined> {
  if (isMockStripe() || !restaurantId) return undefined
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { stripeConnectAccountId: true },
  })
  return restaurant?.stripeConnectAccountId ?? undefined
}

/** Request options for a call made on behalf of a connected account. */
export function onAccount(stripeAccount?: string) {
  return stripeAccount ? { stripeAccount } : {}
}

export function paymentErrorStatus(err: unknown): number {
  return err instanceof PaymentsNotConnectedError ? 409 : 500
}
