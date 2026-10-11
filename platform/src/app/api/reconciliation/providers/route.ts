import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { resolveLocationContext } from '@/lib/location-context'

// GET /api/reconciliation/providers
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let locationId = req.nextUrl.searchParams.get('locationId')
    if (!locationId) {
      const loc = await resolveLocationContext(session.user.id, session.user.restaurantId)
      locationId = loc?.id || null
    }
    if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 })

    const providers = await prisma.deliveryProvider.findMany({
      where: { locationId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(providers)
  } catch (error: any) {
    console.error('GET /api/reconciliation/providers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/reconciliation/providers
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    let { locationId, name, slug, apiKey, webhookSecret } = body

    if (!locationId) {
      const loc = await resolveLocationContext(session.user.id, session.user.restaurantId)
      locationId = loc?.id || null
    }

    if (!locationId || !name || !slug) {
      return NextResponse.json({ error: 'locationId, name, and slug are required' }, { status: 400 })
    }

    const provider = await prisma.deliveryProvider.upsert({
      where: { locationId_slug: { locationId, slug } },
      create: { locationId, name, slug, apiKey, webhookSecret },
      update: { name, apiKey, webhookSecret, isActive: true },
    })

    return NextResponse.json(provider, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/reconciliation/providers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
