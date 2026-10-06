import { prisma } from '@/lib/prisma'

const DEFAULT_TAX_RATE = 0.08 // 8% fallback if no taxes configured

/**
 * Reads the restaurant's active tax rates from settings and returns
 * the combined decimal rate (e.g. CGST 9% + SGST 9% → 0.18).
 * Falls back to DEFAULT_TAX_RATE if no active taxes are configured.
 */
export async function getEffectiveTaxRate(restaurantId: string): Promise<number> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    })

    const settings = (restaurant?.settings as Record<string, any>) || {}
    const taxes: Array<{ rate: string | number; isActive?: boolean }> = settings?.taxes || []
    const activeTaxes = taxes.filter((t) => t.isActive !== false)

    if (activeTaxes.length === 0) return DEFAULT_TAX_RATE

    const totalRatePct = activeTaxes.reduce(
      (sum, t) => sum + (parseFloat(String(t.rate)) || 0),
      0,
    )
    return totalRatePct / 100
  } catch {
    return DEFAULT_TAX_RATE
  }
}

/**
 * Reads enabled payment methods from settings.
 * Returns a Set of allowed method strings (uppercase e.g. 'CASH', 'CARD').
 */
export async function getAllowedPaymentMethods(restaurantId: string): Promise<Set<string> | null> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    })

    const settings = (restaurant?.settings as Record<string, any>) || {}
    const paymentTypes: Record<string, boolean> = settings?.paymentTypes || {}

    // If no payment types configured at all, allow everything
    if (Object.keys(paymentTypes).length === 0) return null

    const methodMap: Record<string, string> = {
      cash: 'CASH',
      card: 'CARD',
      wallet: 'WALLET',
      paypal: 'PAYPAL',
      qrReader: 'QR_CODE',
      applePay: 'APPLE_PAY',
      googlePay: 'GOOGLE_PAY',
      cardReader: 'CARD_READER',
      bank: 'BANK_TRANSFER',
    }

    const allowed = new Set<string>(['CASH', 'CARD', 'APPLE_PAY', 'GOOGLE_PAY'])
    for (const [key, enabled] of Object.entries(paymentTypes)) {
      if (enabled && methodMap[key]) {
        allowed.add(methodMap[key])
      }
    }

    return allowed
  } catch {
    return null // allow all on error
  }
}

/**
 * Reads feature flags from settings.store and returns them.
 */
export async function getFeatureFlags(restaurantId: string): Promise<Record<string, boolean>> {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    })
    const settings = (restaurant?.settings as Record<string, any>) || {}
    return settings?.store || {}
  } catch {
    return {}
  }
}

/**
 * Reads print settings from restaurant settings.
 */
export async function getPrintSettings(restaurantId: string) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    })
    const settings = (restaurant?.settings as Record<string, any>) || {}
    return {
      enablePrint: true,
      showStoreDetails: true,
      showCustomerDetails: true,
      showNotes: true,
      header: '',
      footer: '',
      pageSize: '80mm Thermal',
      ...(settings?.print || {}),
    }
  } catch {
    return { enablePrint: true, showStoreDetails: true, showCustomerDetails: true, showNotes: true, header: '', footer: '', pageSize: '80mm Thermal' }
  }
}

/**
 * Reads delivery settings from restaurant settings.
 */
export async function getDeliverySettings(restaurantId: string) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { settings: true },
    })
    const settings = (restaurant?.settings as Record<string, any>) || {}
    return settings?.delivery || null
  } catch {
    return null
  }
}
