import { z } from 'zod'

const paymentMethodEnum = z.enum(['CARD', 'CASH', 'APPLE_PAY', 'GOOGLE_PAY', 'GIFT_CARD'])

export const processPaymentSchema = z.object({
  orderId:               z.string().min(1, 'Order ID is required'),
  method:                paymentMethodEnum,
  subtotal:              z.number().min(0),
  tax:                   z.number().min(0),
  tip:                   z.number().min(0).default(0),
  total:                 z.number().min(0),
  cashReceived:          z.number().min(0).optional(),
  cashChange:            z.number().min(0).optional(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeChargeId:       z.string().optional().nullable(),
  couponCode:            z.string().optional().nullable(),
  couponDiscount:        z.number().min(0).optional().nullable(),
})

export const splitPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  splits: z
    .array(
      z.object({
        guestRef:              z.string().min(1, 'Guest reference name is required'),
        method:                paymentMethodEnum,
        subtotal:              z.number().min(0),
        tip:                   z.number().min(0).default(0),
        total:                 z.number().min(0),
        stripePaymentIntentId: z.string().optional().nullable(),
      })
    )
    .min(2, 'Split billing requires at least 2 splits'),
})

export const voidPaymentSchema = z.object({
  reason: z.string().min(1, 'Reason for voiding is required').max(300),
})

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>
export type SplitPaymentInput   = z.infer<typeof splitPaymentSchema>
export type VoidPaymentInput    = z.infer<typeof voidPaymentSchema>
