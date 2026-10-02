import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyRestaurantPlan } from '@/lib/plan-gate'

// ─── GET /api/customers/:id ───────────────────────────────────────────────────
// Returns full customer profile: identity, stats, order history, loyalty redemptions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = await verifyRestaurantPlan(session.user.restaurantId, 'PRO')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Guest CRM is a Pro feature. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
      include: {
        tier: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            table: { select: { name: true } },
            items: {
              include: {
                menuItem: { select: { name: true } },
              },
            },
          },
        },
        redemptions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            reward: { select: { name: true, pointsRequired: true } },
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('[GET /api/customers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/customers/:id ─────────────────────────────────────────────────
// Update customer identity fields, consent, tags, allergies, notes
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.customer.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const {
      name,
      phone,
      email,
      allergyTags,
      tags,
      notes,
      marketingConsentEmail,
      marketingConsentSms,
      marketingConsentWhatsApp,
      birthDate,
      tierId,
    } = await req.json()

    const { normalizePhone, normalizeEmail } = await import('@/lib/customer-crm')

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: normalizePhone(phone) } : {}),
        ...(email !== undefined ? { email: normalizeEmail(email) } : {}),
        ...(allergyTags !== undefined ? { allergyTags } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(marketingConsentEmail !== undefined ? { marketingConsentEmail: Boolean(marketingConsentEmail) } : {}),
        ...(marketingConsentSms !== undefined ? { marketingConsentSms: Boolean(marketingConsentSms) } : {}),
        ...(marketingConsentWhatsApp !== undefined ? { marketingConsentWhatsApp: Boolean(marketingConsentWhatsApp) } : {}),
        ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
        ...(tierId !== undefined ? { tierId: tierId || null } : {}),
      },
      include: { tier: true },
    })

    return NextResponse.json({ customer: updated })
  } catch (error) {
    console.error('[PATCH /api/customers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}