import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe, isMockStripe } from '@/lib/stripe'
import { requireConnectedAccount, paymentErrorStatus } from '@/lib/stripe-connect'
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
  if (isMockStripe()) return NextResponse.json({ reader: { id: 'tmr_mock', label: 'Simulated reader', status: 'online' }, mock: true })
  if (!ctx.location.stripeReaderId) return NextResponse.json({ reader: null })

  try {
    const stripeAccount = await requireConnectedAccount(ctx.restaurantId)
    const reader = await stripe.terminal.readers.retrieve(ctx.location.stripeReaderId, {}, { stripeAccount })
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
    state: z.string().min(2),
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
  if (isMockStripe()) {
    return NextResponse.json({ error: 'Stripe keys are not configured in this environment.' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { registrationCode, label, address } = parsed.data

  try {
    const stripeAccount = await requireConnectedAccount(ctx.restaurantId)

    let terminalLocationId = ctx.location.stripeTerminalLocationId
    if (!terminalLocationId) {
      const terminalLocation = await stripe.terminal.locations.create(
        {
          display_name: ctx.location.name,
          address: {
            line1: address.line1,
            city: address.city,
            state: address.state,
            postal_code: address.postalCode,
            country: 'US',
          },
        },
        { stripeAccount },
      )
      terminalLocationId = terminalLocation.id
    }

    const reader = await stripe.terminal.readers.create(
      { registration_code: registrationCode, label, location: terminalLocationId },
      { stripeAccount },
    )

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
