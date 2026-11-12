/**
 * Browser helper for in-person card payments on the paired Stripe card reader.
 * Pushes the amount to the reader, then waits for the guest to tap/dip/swipe.
 * Resolves with the PaymentIntent id to record via /api/payments.
 * Pass a signal to let the cashier cancel; the reader is cleared when it fires.
 */
export async function collectCardOnReader(
  orderId: string,
  amount: number,
  opts: { attempt?: string; timeoutMs?: number; onStatus?: (status: string) => void; signal?: AbortSignal } = {},
): Promise<string> {
  const cancelReader = () => fetch('/api/payments/terminal/process', { method: 'DELETE' }).catch(() => {})
  const cancelled = () => new Error('Card payment was cancelled')
  if (opts.signal?.aborted) throw cancelled()

  // The signal is deliberately not passed to this fetch: aborting mid-POST could leave the reader
  // armed while we never learn the PaymentIntent. We check the signal as soon as it resolves instead.
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
  if (opts.signal?.aborted) {
    await cancelReader()
    throw cancelled()
  }

  const paymentIntentId = start.paymentIntentId as string
  opts.onStatus?.('Waiting for the card on the reader…')

  const deadline = Date.now() + (opts.timeoutMs ?? 120_000)
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500))
    if (opts.signal?.aborted) {
      await cancelReader()
      throw cancelled()
    }
    const res = await fetch(`/api/payments/terminal/process?paymentIntentId=${encodeURIComponent(paymentIntentId)}`).catch(() => null)
    if (!res || !res.ok) continue // transient network blip — keep polling
    const body = await res.json().catch(() => ({}))
    if (body.status === 'succeeded') return paymentIntentId
    if (body.error) throw new Error(`Card declined: ${body.error}`)
    if (body.status === 'canceled') throw cancelled()
  }

  await cancelReader()
  throw new Error('Timed out waiting for the card. Please try again.')
}
