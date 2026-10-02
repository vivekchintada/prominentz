import { NextRequest, NextResponse } from 'next/server'
import { quoteOnlineOrder } from '@/lib/online-ordering'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  locationId: z.string(),
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
  tip: z.number().min(0).optional(),
  scheduledFor: z.string().datetime().optional(),
  address: z
    .object({
      addressLine1: z.string().min(3),
      addressLine2: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2),
      postalCode: z.string().min(3),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const p = schema.safeParse(await req.json())
    if (!p.success) {
      return NextResponse.json({ error: p.error.flatten() }, { status: 400 })
    }

    const quote = await quoteOnlineOrder(p.data)
    return NextResponse.json(quote)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Quote failed' },
      { status: 400 }
    )
  }
}
