import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { quoteOnlineOrder } from '@/lib/online-ordering'
import { fireOnlineOrder } from '@/lib/online-order-orchestration'
import { createPaymentIntent } from '@/lib/stripe'
import { sendOrderConfirmationNotification } from '@/lib/order-notifications'
import { randomBytes } from 'crypto'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  locationId: z.string(),
  tableId: z.string().optional(),
  fulfilmentType: z.enum(['PICKUP', 'DELIVERY', 'DINE_IN']),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().positive(),
        modifierOptionIds: z.array(z.string()).optional(),
        specialNote: z.string().max(300).optional(),
      })
    )
    .min(1),
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional(),
  }),
  scheduledFor: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  tip: z.number().min(0).optional(),
  paymentMethod: z.enum(['CARD', 'PAY_LATER']).default('PAY_LATER'),
  idempotencyKey: z.string().min(8),
  address: z
    .object({
      addressLine1: z.string().min(3),
      addressLine2: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2),
      postalCode: z.string().min(3),
      instructions: z.string().optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const p = schema.safeParse(await req.json())
    if (!p.success) {
      return NextResponse.json({ error: p.error.flatten() }, { status: 400 })
    }

    const d = p.data

    // 1. Idempotency Check: Don't recreate order on duplicate submit
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: d.idempotencyKey },
    })
    if (existing) {
      return NextResponse.json({
        orderId: existing.id,
        trackingToken: existing.trackingToken,
        orderNumber: existing.publicOrderNumber,
        status: existing.onlineStatus,
        total: Number(existing.total),
      })
    }

    if (d.fulfilmentType === 'DELIVERY' && !d.address) {
      return NextResponse.json({ error: 'Delivery address required' }, { status: 400 })
    }

    // 2. Server-side quote & validation (checks holiday closures, operating hours, delivery radius)
    const q = await quoteOnlineOrder(d)

    // 3. Resolve table target
    let tableId = d.tableId
    if (d.fulfilmentType === 'DINE_IN') {
      const table = await prisma.table.findFirst({
        where: { id: tableId, locationId: d.locationId },
      })
      if (!table) return NextResponse.json({ error: 'Valid table required' }, { status: 400 })
    } else {
      const table =
        (await prisma.table.findFirst({
          where: { locationId: d.locationId, name: 'Online Orders' },
        })) ||
        (await prisma.table.create({
          data: {
            locationId: d.locationId,
            name: 'Online Orders',
            capacity: 999,
            floor: 'Online',
            shape: 'rectangle',
          },
        }))
      tableId = table.id
    }

    // 4. Capacity slot validation for scheduled orders
    if (d.scheduledFor) {
      const when = new Date(d.scheduledFor)
      if (when.getTime() < Date.now() + 15 * 60000) {
        return NextResponse.json(
          { error: 'Scheduled time must be at least 15 minutes ahead' },
          { status: 400 }
        )
      }
      const count = await prisma.order.count({
        where: {
          table: { locationId: d.locationId },
          scheduledFor: {
            gte: new Date(when.getTime() - q.config.slotDurationMinutes * 30000),
            lte: new Date(when.getTime() + q.config.slotDurationMinutes * 30000),
          },
          onlineStatus: { notIn: ['REJECTED', 'CANCELLED'] },
        },
      })
      if (count >= q.config.maximumOrdersPerSlot) {
        return NextResponse.json({ error: 'Selected time slot is full' }, { status: 409 })
      }
    }

    // 5. Unify or create customer profile
    let linkedCustomerId: string | null = null
    try {
      const { findOrCreateCustomer } = await import('@/lib/customer-crm')
      const cust = await findOrCreateCustomer({
        restaurantId: q.location.restaurantId,
        phone: d.customer.phone,
        email: d.customer.email,
        name: d.customer.name,
        source: 'ONLINE',
      })
      linkedCustomerId = cust.id
    } catch (custErr) {
      console.error('[Online Ordering] Customer unification error:', custErr)
    }

    // 6. Create Order
    const token = randomBytes(24).toString('hex')
    const num = `ON-${Date.now().toString().slice(-6)}`
    const automatic = q.config.acceptanceMode === 'AUTOMATIC' && d.paymentMethod === 'PAY_LATER'

    const order = await prisma.order.create({
      data: {
        tableId: tableId!,
        customerId: linkedCustomerId,
        orderSource:
          d.fulfilmentType === 'PICKUP'
            ? 'WEB_PICKUP'
            : d.fulfilmentType === 'DELIVERY'
            ? 'WEB_DELIVERY'
            : 'QR_DINE_IN',
        fulfilmentType: d.fulfilmentType,
        onlineStatus:
          d.paymentMethod === 'CARD'
            ? 'PAYMENT_PENDING'
            : automatic
            ? 'ACCEPTED'
            : 'PENDING_ACCEPTANCE',
        status: 'OPEN',
        publicOrderNumber: num,
        trackingToken: token,
        idempotencyKey: d.idempotencyKey,
        customerName: d.customer.name,
        customerPhone: d.customer.phone,
        customerEmail: d.customer.email,
        scheduledFor: d.scheduledFor ? new Date(d.scheduledFor) : null,
        notes: d.notes,
        subtotal: q.subtotal,
        tax: q.tax,
        serviceCharge: q.serviceCharge,
        deliveryFee: q.deliveryFee,
        tip: q.tip,
        total: q.total,
        paymentStatus: d.paymentMethod === 'CARD' ? 'PENDING' : 'PAY_ON_FULFILMENT',
        items: {
          create: q.items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            priceAtOrder: i.unitPrice,
            modifiers: i.modifiers as any,
            specialNote: i.specialNote,
            status: 'PENDING',
            station: i.kdsStation,
          })),
        },
        deliveryAddress: d.address
          ? {
              create: {
                locationId: d.locationId,
                addressLine1: d.address.addressLine1,
                addressLine2: d.address.addressLine2,
                city: d.address.city,
                state: d.address.state,
                postalCode: d.address.postalCode,
                instructions: d.address.instructions,
                distanceKm: q.deliveryValidation?.distanceKm,
                latitude: q.deliveryValidation?.lat,
                longitude: q.deliveryValidation?.lng,
              },
            }
          : undefined,
        events: {
          create: {
            eventType: 'online_order.created',
            metadata: { fulfilmentType: d.fulfilmentType, paymentMethod: d.paymentMethod },
          },
        },
      },
      include: {
        table: {
          include: {
            location: {
              include: {
                restaurant: true,
              },
            },
          },
        },
      },
    })

    let payment = null
    if (d.paymentMethod === 'CARD') {
      const intent = await createPaymentIntent(Math.round(q.total * 100), order.id)
      await prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: intent.id },
      })
      payment = intent
    }

    if (automatic && !d.scheduledFor) {
      await fireOnlineOrder(order.id, 'AUTO_ACCEPT')
    }

    // Send confirmation notification for pay later orders immediately
    if (d.paymentMethod === 'PAY_LATER') {
      const origin = req.nextUrl.origin || 'http://localhost:3000'
      await sendOrderConfirmationNotification({
        orderNumber: num,
        customerName: d.customer.name,
        customerEmail: d.customer.email,
        customerPhone: d.customer.phone,
        fulfilmentType: d.fulfilmentType,
        items: q.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
        total: q.total,
        trackingUrl: `${origin}/order/track/${token}`,
        restaurantName: order.table.location.restaurant.name || 'Our Restaurant',
      })
    }

    return NextResponse.json(
      {
        orderId: order.id,
        trackingToken: token,
        orderNumber: num,
        status: order.onlineStatus,
        total: q.total,
        payment,
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('[Create Online Order Error]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Order failed' },
      { status: 400 }
    )
  }
}
