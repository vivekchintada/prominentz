import { prisma } from '@/lib/prisma'
import { PointsLedgerType } from '@prisma/client'

/**
 * Normalizes phone numbers:
 * Removes spaces, dashes, parentheses, formatting characters.
 * Standardizes to E.164-like format (e.g. "+15551234567" or clean digits).
 */
export function normalizePhone(phone: string): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return hasPlus ? `+${digits}` : digits
}

/**
 * Normalizes emails: lowercases and trims.
 */
export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null
  const clean = email.trim().toLowerCase()
  return clean.length > 0 ? clean : null
}

/**
 * Finds an existing customer or creates a unified profile.
 * Prevents duplicates by checking normalized phone and email.
 */
export async function findOrCreateCustomer(params: {
  restaurantId: string
  phone: string
  email?: string | null
  name?: string | null
  source?: string
  notes?: string | null
  marketingConsentEmail?: boolean
  marketingConsentSms?: boolean
}) {
  const normPhone = normalizePhone(params.phone)
  const normEmail = normalizeEmail(params.email)
  const customerName = (params.name || '').trim() || 'Guest'

  if (!normPhone) {
    throw new Error('Valid phone number is required to find or create customer profile.')
  }

  // 1. Try finding existing customer by normalized phone
  let customer = await prisma.customer.findFirst({
    where: {
      restaurantId: params.restaurantId,
      phone: normPhone,
    },
    include: { tier: true },
  })

  // 2. If not found by phone and email is present, check by email
  if (!customer && normEmail) {
    customer = await prisma.customer.findFirst({
      where: {
        restaurantId: params.restaurantId,
        email: normEmail,
      },
      include: { tier: true },
    })
  }

  // 3. If found, update missing attributes
  if (customer) {
    const updates: any = {}
    if (!customer.email && normEmail) updates.email = normEmail
    if ((!customer.name || customer.name === 'Guest') && customerName !== 'Guest') {
      updates.name = customerName
    }
    if (params.source && customer.source !== params.source) {
      // Keep primary source or note recent channel
    }

    if (Object.keys(updates).length > 0) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: updates,
        include: { tier: true },
      })
    }
    return customer
  }

  // 4. Create new unified customer
  // Check if welcome bonus points are configured
  const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
    where: { restaurantId: params.restaurantId },
  })
  const welcomeBonus = loyaltyConfig?.welcomeBonusPoints || 0

  const newCustomer = await prisma.customer.create({
    data: {
      restaurantId: params.restaurantId,
      name: customerName,
      phone: normPhone,
      email: normEmail,
      source: params.source || 'POS',
      notes: params.notes || null,
      pointsBalance: welcomeBonus,
      marketingConsentEmail: params.marketingConsentEmail ?? true,
      marketingConsentSms: params.marketingConsentSms ?? true,
      marketingConsentWhatsApp: false,
    },
    include: { tier: true },
  })

  // Log welcome bonus ledger entry if applicable
  if (welcomeBonus > 0) {
    await prisma.pointsLedger.create({
      data: {
        customerId: newCustomer.id,
        type: PointsLedgerType.WELCOME_BONUS,
        pointsChange: welcomeBonus,
        balanceAfter: welcomeBonus,
        reason: 'Welcome bonus upon registration',
      },
    })
  }

  return newCustomer
}

/**
 * Calculates and updates customer loyalty tier based on lifetime spend.
 */
export async function evaluateAndUpdateCustomerTier(customerId: string, restaurantId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, lifetimeSpend: true, tierId: true },
  })
  if (!customer) return null

  const tiers = await prisma.loyaltyTier.findMany({
    where: { restaurantId },
    orderBy: { minimumSpend: 'desc' },
  })

  if (tiers.length === 0) return null

  const spend = Number(customer.lifetimeSpend)
  const eligibleTier = tiers.find((t) => spend >= Number(t.minimumSpend))

  if (eligibleTier && eligibleTier.id !== customer.tierId) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { tierId: eligibleTier.id },
    })
    return eligibleTier
  }

  return null
}

/**
 * Atomically records a points change, updates the customer balance, and checks tier progression.
 */
export async function recordPointsTransaction(params: {
  customerId: string
  type: PointsLedgerType
  pointsChange: number
  orderId?: string
  reason?: string
  actorId?: string
}) {
  const { customerId, type, pointsChange, orderId, reason, actorId } = params

  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      select: { id: true, pointsBalance: true, restaurantId: true, lifetimeSpend: true },
    })
    if (!customer) throw new Error('Customer not found')

    const newBalance = Math.max(0, customer.pointsBalance + pointsChange)

    const ledger = await tx.pointsLedger.create({
      data: {
        customerId,
        orderId: orderId || null,
        type,
        pointsChange,
        balanceAfter: newBalance,
        reason: reason || null,
        actorId: actorId || null,
      },
    })

    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: { pointsBalance: newBalance },
      include: { tier: true },
    })

    return { customer: updatedCustomer, ledger }
  })
}

/**
 * Awards loyalty points for a settled order (POS or Online).
 * Ensures points are awarded ONCE per completed order.
 */
export async function awardOrderPoints(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { include: { tier: true } },
      table: { select: { location: { select: { restaurantId: true } } } },
    },
  })

  if (!order || !order.customerId || !order.customer) {
    return { awarded: false, reason: 'No customer linked to order' }
  }

  // Idempotency check: verify points have not already been awarded for this order
  const existingLedger = await prisma.pointsLedger.findFirst({
    where: {
      orderId,
      customerId: order.customerId,
      type: PointsLedgerType.EARNED_PURCHASE,
    },
  })

  if (existingLedger) {
    return { awarded: false, reason: 'Points already awarded for this order' }
  }

  const restaurantId = order.table?.location?.restaurantId
  if (!restaurantId) {
    return { awarded: false, reason: 'Restaurant context not found' }
  }

  const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
    where: { restaurantId },
  })

  if (loyaltyConfig && !loyaltyConfig.isEnabled) {
    return { awarded: false, reason: 'Loyalty program disabled' }
  }

  const rate = loyaltyConfig?.pointsPerDollar || 1.0
  const multiplier = order.customer.tier?.pointsMultiplier || 1.0
  const subtotal = Number(order.subtotal || 0)
  const pointsEarned = Math.max(0, Math.floor(subtotal * rate * multiplier))

  if (pointsEarned <= 0) {
    return { awarded: false, reason: 'Zero points calculated' }
  }

  // Transactionally award points and update customer visit stats
  await prisma.$transaction(async (tx) => {
    const totalOrderAmount = Number(order.total || 0)

    const updatedCust = await tx.customer.update({
      where: { id: order.customerId! },
      data: {
        pointsBalance: { increment: pointsEarned },
        lifetimeSpend: { increment: totalOrderAmount },
        totalVisits: { increment: 1 },
        lastVisitAt: new Date(),
      },
    })

    await tx.pointsLedger.create({
      data: {
        customerId: order.customerId!,
        orderId,
        type: PointsLedgerType.EARNED_PURCHASE,
        pointsChange: pointsEarned,
        balanceAfter: updatedCust.pointsBalance,
        reason: `Earned ${pointsEarned} pts on order #${orderId.slice(-6)} ($${subtotal.toFixed(2)} subtotal)`,
      },
    })
  })

  // Check if lifetime spend unlocks a new tier
  await evaluateAndUpdateCustomerTier(order.customerId, restaurantId)

  return { awarded: true, pointsEarned }
}

/**
 * Reverses loyalty points when an order is voided or refunded.
 * Reverses points and adjusts customer lifetime spend.
 */
export async function reverseOrderPoints(orderId: string, reason = 'Order voided or refunded') {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: { select: { location: { select: { restaurantId: true } } } },
    },
  })

  if (!order || !order.customerId) {
    return { reversed: false, reason: 'No customer linked' }
  }

  // Find points originally earned on this order
  const earnedLedger = await prisma.pointsLedger.findFirst({
    where: {
      orderId,
      customerId: order.customerId,
      type: PointsLedgerType.EARNED_PURCHASE,
    },
  })

  if (!earnedLedger) {
    return { reversed: false, reason: 'No points were previously awarded for this order' }
  }

  // Check if reversal was already executed
  const existingReversal = await prisma.pointsLedger.findFirst({
    where: {
      orderId,
      customerId: order.customerId,
      type: PointsLedgerType.REFUND_REVERSAL,
    },
  })

  if (existingReversal) {
    return { reversed: false, reason: 'Points already reversed for this order' }
  }

  const pointsToReverse = earnedLedger.pointsChange
  const totalOrderAmount = Number(order.total || 0)

  await prisma.$transaction(async (tx) => {
    const cust = await tx.customer.findUnique({
      where: { id: order.customerId! },
      select: { pointsBalance: true, lifetimeSpend: true },
    })
    if (!cust) return

    const newBalance = Math.max(0, cust.pointsBalance - pointsToReverse)
    const newSpend = Math.max(0, Number(cust.lifetimeSpend) - totalOrderAmount)

    await tx.customer.update({
      where: { id: order.customerId! },
      data: {
        pointsBalance: newBalance,
        lifetimeSpend: newSpend,
      },
    })

    await tx.pointsLedger.create({
      data: {
        customerId: order.customerId!,
        orderId,
        type: PointsLedgerType.REFUND_REVERSAL,
        pointsChange: -pointsToReverse,
        balanceAfter: newBalance,
        reason: `${reason} (order #${orderId.slice(-6)})`,
      },
    })
  })

  const restaurantId = order.table?.location?.restaurantId
  if (restaurantId) {
    await evaluateAndUpdateCustomerTier(order.customerId, restaurantId)
  }

  return { reversed: true, pointsReversed: pointsToReverse }
}
