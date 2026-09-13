import { z } from 'zod'

// ─── Category Schemas ─────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(80),
  displayOrder: z.number().int().min(0).optional().default(0),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  displayOrder: z.number().int().min(0).optional(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string()).min(1),
})

// ─── Item Schemas ─────────────────────────────────────────────────────────────

export const kdsStationEnum = z.enum(['HOT', 'COLD', 'BAR', 'EXPO'])

export const createItemSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Item name is required').max(120),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().min(0, 'Price must be non-negative'),
  netPrice: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(1).optional().default(0),
  imageUrl: z.string().optional().nullable(),
  isVeg: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
  kdsStation: kdsStationEnum.optional().default('HOT'),
})

export const updateItemSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().min(0).optional(),
  netPrice: z.number().min(0).optional().nullable(),
  taxRate: z.number().min(0).max(1).optional(),
  imageUrl: z.string().optional().nullable(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  kdsStation: kdsStationEnum.optional(),
})

export const toggle86Schema = z.object({
  is86d: z.boolean(),
  reason: z.string().max(200).optional(),
})

// ─── Addon Schemas ────────────────────────────────────────────────────────────

export const createAddonSchema = z.object({
  parentItem: z.string().min(1, 'Parent item or category is required').max(80),
  name: z.string().min(1, 'Addon name is required').max(80),
  price: z.number().min(0, 'Price must be non-negative'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
})

export const updateAddonSchema = createAddonSchema.partial()

// ─── Coupon Schemas ───────────────────────────────────────────────────────────

export const createCouponSchema = z.object({
  code: z.string().min(2, 'Code is required').max(30).transform((v) => v.toUpperCase().trim()),
  validCategory: z.string().optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountAmount: z.number().min(0, 'Discount amount must be non-negative'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  pointsCost: z.number().int().min(0).optional().default(0),
  pointsReward: z.number().int().min(0).optional().default(0),
  status: z.enum(['ACTIVE', 'EXPIRED', 'INACTIVE']).optional().default('ACTIVE'),
  usageLimit: z.number().int().min(1).optional().nullable(),
})

export const updateCouponSchema = createCouponSchema.partial()

// ─── Modifier Schemas ─────────────────────────────────────────────────────────

export const modifierOptionSchema = z.object({
  name: z.string().min(1).max(80),
  priceAdjustment: z.number().optional().default(0),
  displayOrder: z.number().int().min(0).optional().default(0),
})

export const createModifierSchema = z.object({
  menuItemId: z.string().min(1),
  name: z.string().min(1, 'Modifier group name is required').max(80),
  isRequired: z.boolean().optional().default(false),
  minSelect: z.number().int().min(0).optional().default(0),
  maxSelect: z.number().int().min(1).optional().default(1),
  displayOrder: z.number().int().min(0).optional().default(0),
  options: z.array(modifierOptionSchema).min(1, 'At least one option required'),
})

export const updateModifierSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  isRequired: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
  displayOrder: z.number().int().min(0).optional(),
  options: z.array(modifierOptionSchema).optional(),
})

// ─── Types inferred from schemas ─────────────────────────────────────────────

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
export type Toggle86Input = z.infer<typeof toggle86Schema>
export type CreateModifierInput = z.infer<typeof createModifierSchema>
export type UpdateModifierInput = z.infer<typeof updateModifierSchema>
