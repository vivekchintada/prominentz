import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { connectCountryNeedsState, suggestedConnectCountry } from '@/lib/stripe-connect-countries'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { requireRestaurantStripe, restaurantStripeCountry, paymentErrorStatus } from '@/lib/restaurant-stripe'
import { getRestaurantMoneySettings } from '@/lib/settings-helpers'
import { resolveUserLocation } from '@/lib/location-resolver'

export const dynamic = 'force-dynamic'

async function context() {
  const session = await auth()
  if (!session?.user) return null
  const resolved = await resolveUserLocation(session.user)
  const restaurantId = resolved?.restaurantId || session.user.restaurantId
  if (!restaurantId || !resolved?.locationId) return null
  const location = await prisma.location.findFirst({
    where: { id: resolved.locationId, restaurantId },
    select: { id: true, name: true, stripeReaderId: true, stripeTerminalLocationId: true },
  })
  if (!location) return null
  return { session, restaurantId, location }
}

// ─── GET: the card reader paired with this location ───────────────────────────
export async function GET() {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const client = await requireRestaurantStripe(ctx.restaurantId)
    if (!client) return NextResponse.json({ reader: { id: 'tmr_mock', label: 'Simulated reader', status: 'online' }, mock: true })
    if (!ctx.location.stripeReaderId) return NextResponse.json({ reader: null })
    const reader = await client.terminal.readers.retrieve(ctx.location.stripeReaderId)
    if ('deleted' in reader && reader.deleted) return NextResponse.json({ reader: null })
    return NextResponse.json({
      reader: { id: reader.id, label: reader.label, status: reader.status, deviceType: reader.device_type },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: paymentErrorStatus(error) })
  }
}

const registerSchema = z.object({
  registrationCode: z.string().min(3),
  label: z.string().min(1).max(60).default('Front counter'),
  address: z.object({
    line1: z.string().min(3),
    city: z.string().min(2),
    state: z.string().max(60).optional().default(''),
    postalCode: z.string().min(3),
  }),
})

// ─── POST: pair a Stripe card reader (e.g. BBPOS WisePOS E, Stripe Reader S700) ─
export async function POST(req: NextRequest) {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(ctx.session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const parsed = registerSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { registrationCode, label, address } = parsed.data

  try {
    const client = await requireRestaurantStripe(ctx.restaurantId)
    if (!client) {
      return NextResponse.json({ error: 'Add your Stripe key in Settings → Payments before pairing a reader.' }, { status: 400 })
    }

    let terminalLocationId = ctx.location.stripeTerminalLocationId
    if (!terminalLocationId) {
      // The reader's location must be in the same country as the restaurant's Stripe account.
      const { currency } = await getRestaurantMoneySettings(ctx.restaurantId)
      const country = (await restaurantStripeCountry(ctx.restaurantId)) || suggestedConnectCountry(currency) || 'US'
      if (connectCountryNeedsState(country) && address.state.trim().length < 2) {
        return NextResponse.json({ error: 'Enter the state or province for the reader address' }, { status: 400 })
      }
      const terminalLocation = await client.terminal.locations.create(
        {
          display_name: ctx.location.name,
          address: {
            line1: address.line1,
            city: address.city,
            ...(address.state.trim() ? { state: address.state.trim() } : {}),
            postal_code: address.postalCode,
            country,
          },
        },
      )
      terminalLocationId = terminalLocation.id
    }

    const reader = await client.terminal.readers.create({ registration_code: registrationCode, label, location: terminalLocationId })

    await prisma.location.update({
      where: { id: ctx.location.id },
      data: { stripeTerminalLocationId: terminalLocationId, stripeReaderId: reader.id },
    })

    return NextResponse.json({ reader: { id: reader.id, label: reader.label, status: reader.status } })
  } catch (error: any) {
    console.error('[POST /api/payments/terminal/readers]', error)
    return NextResponse.json({ error: error.message || 'Could not pair reader' }, { status: paymentErrorStatus(error) })
  }
}

// ─── DELETE: unpair the reader from this location ─────────────────────────────
export async function DELETE() {
  const ctx = await context()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'MANAGER'].includes(ctx.session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await prisma.location.update({ where: { id: ctx.location.id }, data: { stripeReaderId: null } })
  return NextResponse.json({ ok: true })
}
