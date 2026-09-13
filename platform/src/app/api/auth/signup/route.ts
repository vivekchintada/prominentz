import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const signupSchema = z.object({
  restaurantName: z.string().min(2).max(100),
  ownerName:      z.string().min(2).max(100),
  email:          z.string().email(),
  password:       z.string().min(6).max(100),
  locationName:   z.string().min(1).max(100).default('Main Outlet'),
  phone:          z.string().optional().nullable(),
})

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
// Multi-Tenant SaaS Self-Service Registration Endpoint
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { restaurantName, ownerName, email, password, locationName, phone } = parsed.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Generate unique restaurant slug
    const slug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000)

    const passwordHash = await bcrypt.hash(password, 10)

    // Execute atomic tenant onboarding transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Restaurant tenant
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName,
          slug,
        },
      })

      // 2. Create primary Location
      const location = await tx.location.create({
        data: {
          restaurantId: restaurant.id,
          name:         locationName,
          phone:        phone ?? null,
        },
      })

      // 3. Create Owner user account
      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email,
          name:         ownerName,
          passwordHash,
          role:         'OWNER',
        },
      })

      // 4. Create Employee record for owner
      const employee = await tx.employee.create({
        data: {
          locationId: location.id,
          userId:     user.id,
          jobTitle:   'Owner & General Manager',
          phone:      phone ?? null,
          isActive:   true,
        },
      })

      // 5. Seed default Menu Categories
      const appetizers = await tx.menuCategory.create({
        data: { restaurantId: restaurant.id, locationId: location.id, name: 'Starters & Appetizers', displayOrder: 1 },
      })
      const mains = await tx.menuCategory.create({
        data: { restaurantId: restaurant.id, locationId: location.id, name: 'Main Courses', displayOrder: 2 },
      })
      const drinks = await tx.menuCategory.create({
        data: { restaurantId: restaurant.id, locationId: location.id, name: 'Beverages', displayOrder: 3 },
      })

      // Seed sample Menu Items
      await tx.menuItem.create({
        data: {
          categoryId: mains.id,
          name:       'Classic Cheeseburger',
          description: 'Angus beef patty, cheddar, lettuce, tomato, special sauce',
          price:      14.99,
          kdsStation: 'HOT',
        },
      })
      await tx.menuItem.create({
        data: {
          categoryId: drinks.id,
          name:       'Fresh Lemonade',
          description: 'Hand-squeezed lemon juice & mint',
          price:      4.50,
          kdsStation: 'BAR',
        },
      })

      // 6. Seed sample Floor Tables
      await tx.table.createMany({
        data: [
          { locationId: location.id, name: 'Table 1', capacity: 4, posX: 1, posY: 1 },
          { locationId: location.id, name: 'Table 2', capacity: 2, posX: 2, posY: 1 },
          { locationId: location.id, name: 'Table 3', capacity: 6, posX: 1, posY: 2 },
          { locationId: location.id, name: 'Bar 1',   capacity: 1, posX: 3, posY: 1 },
        ],
      })

      return { restaurant, location, user, employee }
    })

    return NextResponse.json({
      message: 'Restaurant tenant created successfully!',
      restaurant: { id: result.restaurant.id, name: result.restaurant.name, slug: result.restaurant.slug },
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/auth/signup]', error)
    return NextResponse.json({ error: 'Internal server error during registration' }, { status: 500 })
  }
}
