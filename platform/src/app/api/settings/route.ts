import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export const DEFAULT_SETTINGS = {
  store: {
    logoUrl: '',
    name: 'Streak House',
    address1: '452 Ocean Drive, Suite 100',
    address2: 'Floor 2',
    country: 'United States',
    state: 'California',
    city: 'Los Angeles',
    pincode: '90001',
    email: 'contact@streakhouse.com',
    phone: '+1 (555) 234-5678',
    currency: 'USD',
    enableQrMenu: true,
    enableOrderViaQr: true,
    enableTakeAway: true,
    enableDelivery: true,
    enableDineIn: true,
    enableTable: true,
    enableReservation: false,
  },
  taxes: [
    { id: '1', name: 'CGST', rate: '9', type: 'Inclusive / Exclusive', isActive: true },
    { id: '2', name: 'SGST', rate: '9', type: 'Inclusive / Exclusive', isActive: true },
    { id: '3', name: 'IGST', rate: '18', type: 'Inclusive / Exclusive', isActive: true },
    { id: '4', name: 'VAT', rate: '10', type: 'Exclusive', isActive: true },
    { id: '5', name: 'Service Tax', rate: '15', type: 'Exclusive', isActive: true },
  ],
  print: {
    enablePrint: true,
    showStoreDetails: true,
    showCustomerDetails: true,
    pageSize: '80mm Thermal',
    header: 'Streak House\n452 Ocean Drive, Suite 100\nTel: +1 (555) 234-5678',
    footer: 'Thank you for dining with us! Please visit again.\nWiFi: StreakHouse-Guest / Pass: delicious2026',
    showNotes: true,
    printTokens: true,
  },
  paymentTypes: {
    cash: true,
    card: true,
    wallet: true,
    paypal: true,
    qrReader: true,
    cardReader: true,
    bank: true,
  },
  delivery: {
    freeDelivery: {
      enabled: true,
      overAmount: '50.00',
    },
    fixedDelivery: {
      enabled: true,
      amount: '5.00',
    },
    kmDelivery: {
      enabled: true,
      perKmCharge: '1.50',
      minDeliveryOver: '20.00',
      minDistanceForFreeDelivery: '10.00',
    },
  },
  notifications: {
    emailAlerts: true,
    smsAlerts: false,
    orderStatusUpdate: true,
    dailySalesReport: true,
    lowStockAlerts: true,
  },
}

// ─── GET /api/settings ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
        planTier: true,
        settings: true,
        createdAt: true,
        locations: {
          take: 1,
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            timezone: true,
          },
        },
      },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const storedSettings = (restaurant.settings as any) || {}
    const mergedSettings = {
      store: {
        ...DEFAULT_SETTINGS.store,
        ...(storedSettings.store || {}),
        name: storedSettings.store?.name || restaurant.name || DEFAULT_SETTINGS.store.name,
      },
      taxes: Array.isArray(storedSettings.taxes) && storedSettings.taxes.length > 0
        ? storedSettings.taxes
        : DEFAULT_SETTINGS.taxes,
      print: {
        ...DEFAULT_SETTINGS.print,
        ...(storedSettings.print || {}),
      },
      paymentTypes: {
        ...DEFAULT_SETTINGS.paymentTypes,
        ...(storedSettings.paymentTypes || {}),
      },
      delivery: {
        ...DEFAULT_SETTINGS.delivery,
        ...(storedSettings.delivery || {}),
        freeDelivery: {
          ...DEFAULT_SETTINGS.delivery.freeDelivery,
          ...(storedSettings.delivery?.freeDelivery || {}),
        },
        fixedDelivery: {
          ...DEFAULT_SETTINGS.delivery.fixedDelivery,
          ...(storedSettings.delivery?.fixedDelivery || {}),
        },
        kmDelivery: {
          ...DEFAULT_SETTINGS.delivery.kmDelivery,
          ...(storedSettings.delivery?.kmDelivery || {}),
        },
      },
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(storedSettings.notifications || {}),
      },
    }

    return NextResponse.json({
      ...restaurant,
      settings: mergedSettings,
    })
  } catch (error) {
    console.error('[GET /api/settings]', error)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

// ─── PATCH /api/settings ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role && !['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Only owners and admins can update settings' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      name,
      locationName,
      address,
      phone,
      timezone,
      planTier,
      settings: newSettings,
      section,
      sectionData,
    } = body

    // Security Gate: Only system admins may manually override plan tier directly
    const allowedPlanTier = (session.user.role === 'ADMIN' && planTier) ? planTier : undefined

    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true, name: true },
    })

    let currentSettings = (existingRestaurant?.settings as any) || {}

    if (section && sectionData !== undefined) {
      currentSettings = {
        ...currentSettings,
        [section]: sectionData,
      }
    } else if (newSettings) {
      currentSettings = {
        ...currentSettings,
        ...newSettings,
      }
    }

    // Sync store name back to restaurant name if provided in store settings
    const updatedStoreName = currentSettings.store?.name || name
    const updatedAddress = currentSettings.store?.address1 || address
    const updatedPhone = currentSettings.store?.phone || phone

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(updatedStoreName ? { name: updatedStoreName } : {}),
        ...(allowedPlanTier ? { planTier: allowedPlanTier } : {}),
        settings: currentSettings,
      },
    })

    // Update primary location details
    const primaryLocation = await prisma.location.findFirst({
      where: { restaurantId },
    })
    if (primaryLocation) {
      await prisma.location.update({
        where: { id: primaryLocation.id },
        data: {
          ...(locationName ? { name: locationName } : {}),
          ...(updatedAddress !== undefined ? { address: updatedAddress } : {}),
          ...(updatedPhone !== undefined ? { phone: updatedPhone } : {}),
          ...(timezone ? { timezone } : {}),
        },
      })
    }

    // Log audit event
    if (session?.user) {
      await logAuditEvent({
        restaurantId,
        actorId: session.user.id,
        actorName: session.user.name,
        action: 'EDIT_SETTINGS',
        targetType: 'Restaurant',
        targetId: restaurantId,
        after: { updatedStoreName, section, hasSettings: true },
      })
    }

    return NextResponse.json({ success: true, settings: currentSettings })
  } catch (error) {
    console.error('[PATCH /api/settings]', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
