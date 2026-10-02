import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const ownerSignupSchema = z.object({
  signupType:      z.literal('OWNER').default('OWNER'),
  restaurantName:  z.string().min(2).max(100),
  ownerName:       z.string().min(2).max(100),
  email:           z.string().email(),
  password:        z.string().min(6).max(100),
  locationName:    z.string().min(1).max(100).default('Main Outlet'),
  phone:           z.string().optional().nullable(),
  managerName:     z.string().optional(),
  managerEmail:    z.string().email().optional(),
  managerPassword: z.string().min(4).optional(),
  serverName:      z.string().optional(),
  serverEmail:     z.string().email().optional(),
  serverPassword:  z.string().min(4).optional(),
  kitchenName:     z.string().optional(),
  kitchenEmail:    z.string().email().optional(),
  kitchenPassword: z.string().min(4).optional(),
})

const staffSignupSchema = z.object({
  signupType:     z.literal('STAFF'),
  name:           z.string().min(2).max(100),
  email:          z.string().email(),
  password:       z.string().min(4).max(100), // supports 4-digit PIN or standard password
  role:           z.enum(['MANAGER', 'SERVER', 'KITCHEN']),
  restaurantCode: z.string().min(1), // restaurant slug or ID
  phone:          z.string().optional().nullable(),
})

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
// Dynamic Multi-Tenant Registration Endpoint (Owner Restaurant Setup & Staff Onboarding)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown-ip'
    const rl = await rateLimit(`auth:signup:${ip}`, 5, 600)
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSec)
    }

    const body = await req.json()
    const signupType = body.signupType === 'STAFF' ? 'STAFF' : 'OWNER'

    // ── Staff Registration (Manager, Server, Kitchen) ────────────────────────
    if (signupType === 'STAFF') {
      const parsed = staffSignupSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
      }

      const { name, email, password, role, restaurantCode, phone } = parsed.data
      const cleanEmail = email.trim().toLowerCase()

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } })
      if (existingUser) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }

      // Look up target restaurant by slug or ID
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          OR: [
            { slug: restaurantCode.trim() },
            { id: restaurantCode.trim() },
            { name: { equals: restaurantCode.trim(), mode: 'insensitive' } },
          ],
        },
        include: {
          locations: {
            take: 1,
            orderBy: { isHeadquarters: 'desc' },
          },
        },
      })

      if (!restaurant || restaurant.locations.length === 0) {
        return NextResponse.json(
          { error: 'Restaurant not found. Please verify the Restaurant Store Code or invite slug.' },
          { status: 404 }
        )
      }

      const locationId = restaurant.locations[0].id
      const passwordHash = await bcrypt.hash(password, 10)

      const titleMap = {
        MANAGER: 'Store Operations Manager',
        SERVER:  'Floor Waiter / Server',
        KITCHEN: 'Line Cook / Kitchen Staff',
      }

      const newUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            restaurantId: restaurant.id,
            email:        cleanEmail,
            name,
            passwordHash,
            role,
          },
        })

        await tx.employee.create({
          data: {
            locationId,
            userId:     user.id,
            jobTitle:   titleMap[role] || 'Staff Member',
            phone:      phone ?? null,
            isActive:   true,
          },
        })

        return user
      })

      return NextResponse.json(
        {
          success: true,
          message: `${role} account registered successfully.`,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            restaurantId: restaurant.id,
          },
        },
        { status: 201 }
      )
    }

    // ── Owner Registration (Tenant & Location Setup) ─────────────────────────
    const parsed = ownerSignupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { restaurantName, ownerName, email, password, locationName, phone } = parsed.data
    const cleanEmail = email.trim().toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } })
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
          email:        cleanEmail,
          name:         ownerName,
          passwordHash,
          role:         'OWNER',
        },
      })

      // 4. Create Employee record for owner
      await tx.employee.create({
        data: {
          locationId: location.id,
          userId:     user.id,
          jobTitle:   'Owner & General Manager',
          phone:      phone ?? null,
          isActive:   true,
        },
      })

      // 4b. Automatically provision Manager, Server, and Kitchen operational accounts for this restaurant
      const managerEmail = (parsed.data.managerEmail?.trim().toLowerCase()) || `manager.${slug}@resto.app`
      const serverEmail  = (parsed.data.serverEmail?.trim().toLowerCase())  || `server.${slug}@resto.app`
      const kitchenEmail = (parsed.data.kitchenEmail?.trim().toLowerCase()) || `kitchen.${slug}@resto.app`

      const managerPassHash = parsed.data.managerPassword ? await bcrypt.hash(parsed.data.managerPassword, 10) : passwordHash
      const serverPassHash  = parsed.data.serverPassword  ? await bcrypt.hash(parsed.data.serverPassword, 10)  : passwordHash
      const kitchenPassHash = parsed.data.kitchenPassword ? await bcrypt.hash(parsed.data.kitchenPassword, 10) : passwordHash

      // 1. Manager Account & Employee
      const managerUser = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email:        managerEmail,
          name:         parsed.data.managerName?.trim() || `${restaurantName} Manager`,
          passwordHash: managerPassHash,
          role:         'MANAGER',
        },
      })
      await tx.employee.create({
        data: {
          locationId: location.id,
          userId:     managerUser.id,
          jobTitle:   'Store Operations Manager',
          isActive:   true,
        },
      })

      // 2. Server Account & Employee
      const serverUser = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email:        serverEmail,
          name:         parsed.data.serverName?.trim() || `${restaurantName} Server`,
          passwordHash: serverPassHash,
          role:         'SERVER',
        },
      })
      await tx.employee.create({
        data: {
          locationId: location.id,
          userId:     serverUser.id,
          jobTitle:   'Floor Server / Waiter',
          isActive:   true,
        },
      })

      // 3. Kitchen Account & Employee
      const kitchenUser = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email:        kitchenEmail,
          name:         parsed.data.kitchenName?.trim() || `${restaurantName} Kitchen`,
          passwordHash: kitchenPassHash,
          role:         'KITCHEN',
        },
      })
      await tx.employee.create({
        data: {
          locationId: location.id,
          userId:     kitchenUser.id,
          jobTitle:   'Head Chef / Kitchen Line',
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

      return { restaurant, location, user, managerUser, serverUser, kitchenUser }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Restaurant SaaS account created successfully with Manager, Server, and Kitchen teams.',
        restaurant: {
          id:   result.restaurant.id,
          name: result.restaurant.name,
          slug: result.restaurant.slug,
        },
        user: {
          id:    result.user.id,
          email: result.user.email,
          role:  result.user.role,
        },
        starterAccounts: [
          {
            role: 'MANAGER',
            portal: 'Manager Console',
            email: result.managerUser.email,
            name: result.managerUser.name,
            loginUrl: `/login?portal=manager&email=${encodeURIComponent(result.managerUser.email)}`,
          },
          {
            role: 'SERVER',
            portal: 'Server Floor Terminal',
            email: result.serverUser.email,
            name: result.serverUser.name,
            loginUrl: `/login?portal=server&email=${encodeURIComponent(result.serverUser.email)}`,
          },
          {
            role: 'KITCHEN',
            portal: 'Kitchen Display (KDS)',
            email: result.kitchenUser.email,
            name: result.kitchenUser.name,
            loginUrl: `/login?portal=kitchen&email=${encodeURIComponent(result.kitchenUser.email)}`,
          },
        ],
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error during registration' }, { status: 500 })
  }
}
