import { NextRequest, NextResponse } from 'next/server'
import { generateReceiptHtml, getReceiptData } from '@/lib/receipts'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Public receipt viewer — the link emailed to diners. No login (diners don't
 * have accounts); the payment's own cuid is the access control, same as the
 * static files this replaced. Renders fresh from the database on every
 * request instead of a file sitting forever in a public, unauthenticated
 * folder — nothing is written to disk.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown-ip'
  const limited = await rateLimit(`receipt-view:${ip}`, 30, 60)
  if (!limited.allowed) {
    return rateLimitResponse(limited.retryAfterSec)
  }

  const data = await getReceiptData(paymentId)
  if (!data) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  const html = generateReceiptHtml(data)
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
