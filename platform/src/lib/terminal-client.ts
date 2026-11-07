/**
 * Browser helper for in-person card payments on the paired Stripe card reader.
 * Pushes the amount to the reader, then waits for the guest to tap/dip/swipe.
 * Resolves with the PaymentIntent id to record via /api/payments.
 */
export async function collectCardOnReader(
  orderId: string,
  amount: number,
  opts: { attempt?: string; timeoutMs?: number; onStatus?: (status: string) => void } = {},
): Promise<string> {
  const startRes = await fetch('/api/payments/terminal/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount: Math.round(amount * 100) / 100, attempt: opts.attempt }),
  })
  const start = await startRes.json().catch(() => ({}))
  if (!startRes.ok) {
    throw new Error(typeof start.error === 'string' ? start.error : 'Could not reach the card reader')
  }
  if (start.status === 'succeeded') return start.paymentIntentId as string

  const paymentIntentId = start.paymentIntentId as string
  opts.onStatus?.('Waiting for card on reader…')

  const deadline = Date.now() + (opts.timeoutMs ?? 120_000)
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500))
    const res = await fetch(`/api/payments/terminal/process?paymentIntentId=${encodeURIComponent(paymentIntentId)}`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok) continue // transient network blip — keep polling
    if (body.status === 'succeeded') return paymentIntentId
    if (body.error) throw new Error(`Card declined: ${body.error}`)
    if (body.status === 'canceled') throw new Error('Card payment was cancelled')
  }

  await fetch('/api/payments/terminal/process', { method: 'DELETE' }).catch(() => {})
  throw new Error('Timed out waiting for the card. Please try again.')
}
