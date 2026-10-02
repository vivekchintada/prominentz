import { prisma } from '@/lib/prisma'
import type { FulfilmentType } from '@prisma/client'
import { validateDeliveryDistance } from './delivery-geocoding'

export type QuoteItemInput = {
  menuItemId: string
  quantity: number
  modifierOptionIds?: string[]
  specialNote?: string
}

export interface QuoteAddressInput {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
}

export async function quoteOnlineOrder(input: {
  locationId: string
  fulfilmentType: FulfilmentType
  items: QuoteItemInput[]
  tip?: number
  address?: QuoteAddressInput
  scheduledFor?: string | Date
}) {
  const config = await prisma.onlineOrderingConfig.findUnique({
    where: { locationId: input.locationId },
    include: { hours: true },
  })
  const location = await prisma.location.findUnique({ where: { id: input.locationId } })
  if (!location || !config || !config.isEnabled) throw new Error('Online ordering is unavailable')
  if (config.isPaused) throw new Error(config.pauseReason || 'Online ordering is temporarily paused')
  if (!input.items.length) throw new Error('Cart is empty')

  const targetDate = input.scheduledFor ? new Date(input.scheduledFor) : new Date()

  // 1. Holiday closure check
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const holiday = await prisma.orderingHoliday.findFirst({
    where: {
      locationId: input.locationId,
      date: { gte: startOfDay, lt: endOfDay },
      isClosed: true,
    },
  })
  if (holiday) {
    throw new Error(`Location is closed for ${holiday.name} on this date`)
  }

  // 2. Weekly ordering hours validation
  if (config.hours && config.hours.length > 0) {
    const dayOfWeek = targetDate.getDay()
    const matchingHour = config.hours.find(
      (h) => h.dayOfWeek === dayOfWeek && h.orderType === input.fulfilmentType
    )
    if (matchingHour) {
      if (matchingHour.isClosed) {
        throw new Error(`Online ${input.fulfilmentType.toLowerCase()} is closed on this day of the week`)
      }
      const timeMinutes = targetDate.getHours() * 60 + targetDate.getMinutes()
      const [oH, oM] = matchingHour.openTime.split(':').map(Number)
      const [cH, cM] = matchingHour.closeTime.split(':').map(Number)
      const openMinutes = oH * 60 + (oM || 0)
      const closeMinutes = cH * 60 + (cM || 0)

      if (timeMinutes < openMinutes || timeMinutes > closeMinutes) {
        throw new Error(
          `Online ${input.fulfilmentType.toLowerCase()} is only available between ${matchingHour.openTime} and ${matchingHour.closeTime}`
        )
      }
    }
  }

  // 3. Delivery distance validation
  let deliveryValidation = null
  if (input.fulfilmentType === 'DELIVERY' && input.address) {
    const restaurantCoords = location.lat && location.lng ? { lat: location.lat, lng: location.lng } : null
    deliveryValidation = await validateDeliveryDistance(
      restaurantCoords,
      input.address,
      config.deliveryRadiusKm
    )
    if (!deliveryValidation.valid) {
      throw new Error(deliveryValidation.error || 'Delivery address is out of range')
    }
  }

  // 4. Cart price calculation
  const ids = [...new Set(input.items.map((i) => i.menuItemId))]
  const menu = await prisma.menuItem.findMany({
    where: {
      id: { in: ids },
      isAvailable: true,
      is86d: false,
      category: {
        isActive: true,
        restaurantId: location.restaurantId,
        OR: [{ locationId: null }, { locationId: input.locationId }],
      },
    },
    include: { modifiers: { include: { options: true } } },
  })
  if (menu.length !== ids.length) throw new Error('One or more items are no longer available')

  const map = new Map(menu.map((i) => [i.id, i]))
  let subtotal = 0,
    tax = 0

  const normalized = input.items.map((line) => {
    const item = map.get(line.menuItemId)!
    const quantity = Math.max(1, Math.min(50, Math.trunc(line.quantity)))
    const selected = new Set(line.modifierOptionIds || [])
    const modifiers: { id: string; name: string; group: string; price: number }[] = []

    for (const group of item.modifiers) {
      const picks = group.options.filter((o) => selected.has(o.id))
      if (group.isRequired && picks.length < Math.max(1, group.minSelect)) {
        throw new Error(`${group.name} requires a selection`)
      }
      if (picks.length > group.maxSelect) {
        throw new Error(`Too many selections for ${group.name}`)
      }
      for (const option of picks) {
        modifiers.push({
          id: option.id,
          name: option.name,
          group: group.name,
          price: Number(option.priceAdjustment),
        })
      }
    }

    const unitPrice = Number(item.price) + modifiers.reduce((sum, modifier) => sum + modifier.price, 0)
    const lineTotal = unitPrice * quantity
    subtotal += lineTotal
    tax += lineTotal * Number(item.taxRate)

    return {
      menuItemId: item.id,
      name: item.name,
      quantity,
      unitPrice,
      lineTotal,
      modifiers,
      specialNote: line.specialNote?.slice(0, 300) || null,
      kdsStation: item.kdsStation,
    }
  })

  const serviceCharge = (subtotal * Number(config.serviceChargePercent)) / 100
  let deliveryFee = input.fulfilmentType === 'DELIVERY' ? Number(config.deliveryFee) : 0
  if (config.freeDeliveryThreshold && subtotal >= Number(config.freeDeliveryThreshold)) {
    deliveryFee = 0
  }

  const minimum =
    input.fulfilmentType === 'DELIVERY'
      ? Number(config.minimumDeliveryAmount)
      : Number(config.minimumPickupAmount)

  if (subtotal < minimum) {
    throw new Error(`Minimum order is $${minimum.toFixed(2)}`)
  }

  const tip = Math.max(0, Number(input.tip || 0))
  const total = subtotal + tax + serviceCharge + deliveryFee + tip

  return {
    location,
    config,
    items: normalized,
    subtotal,
    tax,
    serviceCharge,
    deliveryFee,
    tip,
    total,
    deliveryValidation,
  }
}
