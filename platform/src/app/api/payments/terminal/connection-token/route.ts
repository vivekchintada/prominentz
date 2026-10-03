import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// ─── POST /api/payments/terminal/connection-token ─────────────────────────────
// Returns a Stripe Terminal connection token for the browser SDK.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER', 'SERVER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const connectionToken = await stripe.terminal.connectionTokens.create()

    return NextResponse.json({ secret: connectionToken.secret })
  } catch (error) {
    console.error('[POST /api/payments/terminal/connection-token]', error)
    return NextResponse.json({ error: 'Failed to create connection token' }, { status: 500 })
  }
}
