import { z } from 'zod'

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

/** Represents a single modifier choice made by the server when adding an item */
const modifierSelectionSchema = z.object({
  modifierName:  z.string(),
  optionName:    z.string(),
  priceDelta:    z.number().default(0),
})

// ─── Order Schemas ────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  tableId:    z.string().min(1, 'Table is required'),
  guestCount: z.number().int().min(1).default(1),
  notes:      z.string().max(500).optional(),
  customerId: z.string().optional().nullable(),
})

export const updateOrderSchema = z.object({
  guestCount: z.number().int().min(1).optional(),
  notes:      z.string().max(500).optional().nullable(),
  customerId: z.string().optional().nullable(),
  status:     z.enum(['OPEN', 'SENT_TO_KITCHEN', 'PARTIALLY_READY', 'READY', 'PAID', 'HOLD', 'VOIDED']).optional(),
})

// ─── Order Item Schemas ───────────────────────────────────────────────────────

export const addItemsSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId:  z.string().min(1, 'Menu item is required'),
        quantity:    z.number().int().min(1).default(1),
        modifiers:   z.array(modifierSelectionSchema).optional().default([]),
        specialNote: z.string().max(200).optional(),
        seatNumber:  z.number().int().min(1).optional().default(1),
      }),
    )
    .min(1, 'At least one item is required'),
})

export const updateOrderItemSchema = z.object({
  quantity:    z.number().int().min(1).optional(),
  modifiers:   z.array(modifierSelectionSchema).optional(),
  specialNote: z.string().max(200).optional().nullable(),
  seatNumber:  z.number().int().min(1).optional(),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateOrderInput    = z.infer<typeof createOrderSchema>
export type UpdateOrderInput    = z.infer<typeof updateOrderSchema>
export type AddItemsInput       = z.infer<typeof addItemsSchema>
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>
