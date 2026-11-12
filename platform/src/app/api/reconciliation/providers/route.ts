import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveOwnedLocation } from '@/lib/location-context'

function withoutSecrets<T extends { apiKey?: string | null; webhookSecret?: string | null }>(p: T) {
  const { apiKey, webhookSecret, ...rest } = p
  return { ...rest, hasApiKey: Boolean(apiKey), hasWebhookSecret: Boolean(webhookSecret) }
}

// GET /api/reconciliation/providers
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const locationId =
      (await resolveOwnedLocation(session.user.id, session.user.restaurantId, req.nextUrl.searchParams.get('locationId')))?.id || null
    if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

    const providers = await prisma.deliveryProvider.findMany({
      where: { locationId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(providers.map(withoutSecrets))
  } catch (error: any) {
    console.error('GET /api/reconciliation/providers error:', error)
    return NextResponse.json({ error: 'Reconciliation request failed' }, { status: 500 })
  }
}

// POST /api/reconciliation/providers
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    let { locationId, name, slug, apiKey, webhookSecret } = body

    locationId = (await resolveOwnedLocation(session.user.id, session.user.restaurantId, locationId))?.id || null

    if (!locationId || !name || !slug) {
      return NextResponse.json({ error: 'locationId, name, and slug are required' }, { status: 400 })
    }

    const provider = await prisma.deliveryProvider.upsert({
      where: { locationId_slug: { locationId, slug } },
      create: { locationId, name, slug, apiKey, webhookSecret },
      update: { name, apiKey, webhookSecret, isActive: true },
    })

    return NextResponse.json(withoutSecrets(provider), { status: 201 })
  } catch (error: any) {
    console.error('POST /api/reconciliation/providers error:', error)
    return NextResponse.json({ error: 'Reconciliation request failed' }, { status: 500 })
  }
}
