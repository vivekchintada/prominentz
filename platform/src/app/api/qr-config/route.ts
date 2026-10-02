import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export interface QrMenuConfig {
  welcomeMessage?: string
  promoText?: string
  accentColor?: string
  mode?: 'dine-in' | 'takeout' | 'both'
  hiddenCategoryIds?: string[]
  updatedAt?: string
}

// ── GET /api/qr-config?locationId=xxx  (public — called by the customer phone) ─
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json({ error: 'locationId required' }, { status: 400 })
    }

    // Resolve restaurantId from locationId (works for unauthenticated guests)
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { restaurantId: true },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: location.restaurantId },
      select: { settings: true },
    })

    const settings = (restaurant?.settings as Record<string, any>) || {}
    const qrConfig: QrMenuConfig = settings?.qrConfig?.[locationId] || {}

    return NextResponse.json(qrConfig)
  } catch (err) {
    console.error('[GET /api/qr-config]', err)
    return NextResponse.json({ error: 'Failed to load QR config' }, { status: 500 })
  }
}

// ── POST /api/qr-config  (auth required — called by the admin QR Studio) ────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { locationId, config }: { locationId: string; config: QrMenuConfig } = body

    if (!locationId || !config) {
      return NextResponse.json({ error: 'locationId and config are required' }, { status: 400 })
    }

    // Verify the location belongs to this restaurant
    const location = await prisma.location.findFirst({
      where: { id: locationId, restaurantId: session.user.restaurantId },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found or access denied' }, { status: 403 })
    }

    // Read current settings and merge
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { settings: true },
    })

    const currentSettings = (restaurant?.settings as Record<string, any>) || {}
    const updatedSettings = {
      ...currentSettings,
      qrConfig: {
        ...(currentSettings.qrConfig || {}),
        [locationId]: {
          ...config,
          updatedAt: new Date().toISOString(),
        },
      },
    }

    await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data: { settings: updatedSettings },
    })

    return NextResponse.json({ success: true, config: updatedSettings.qrConfig[locationId] })
  } catch (err) {
    console.error('[POST /api/qr-config]', err)
    return NextResponse.json({ error: 'Failed to save QR config' }, { status: 500 })
  }
}
