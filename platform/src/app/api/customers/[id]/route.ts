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

// ─── DELETE /api/customers/:id ────────────────────────────────────────────────
// Statutory Right to Erasure (DPDP Act 2023 & GDPR Art. 17)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.customer.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Scrub personal identifiable data in compliance with DPDP 2023 & GDPR
    await prisma.customer.update({
      where: { id },
      data: {
        name: `Redacted Guest #${id.slice(-6)}`,
        phone: null,
        email: null,
        birthDate: null,
        allergyTags: [],
        tags: ['DATA_ERASED'],
        notes: '[Data erased upon request per DPDP 2023 / GDPR statutory request]',
        marketingConsentEmail: false,
        marketingConsentSms: false,
        marketingConsentWhatsApp: false,
        pointsBalance: 0,
      },
    })

    return NextResponse.json({ success: true, message: 'Personal data erased successfully' })
  } catch (error) {
    console.error('[DELETE /api/customers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}