import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { isPlatformAdmin } from '@/lib/hq/platform-admin'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const ownerSignupSchema = z.object({
  restaurantName: z.string().trim().min(2).max(100),
  ownerName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(100),
  locationName: z.string().trim().min(1).max(100).default('Main Outlet'),
  phone: z.string().max(30).optional().nullable(),
})

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
// Public registration is limited to new restaurant owners. Owners and managers
// add staff through the authenticated staff endpoints.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown-ip'
    const rl = await rateLimit(`auth:signup:${ip}`, 5, 600)
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSec)
    }

    const body = await req.json()
    if (body?.signupType === 'STAFF') {
      return NextResponse.json(
        { error: 'Staff self-registration is disabled. Ask an owner or manager to create your account.' },
        { status: 403 }
      )
    }

    const parsed = ownerSignupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { restaurantName, ownerName, email, password, locationName, phone } = parsed.data
    const cleanEmail = email.toLowerCase()

    // Platform-admin addresses grant /hq access; nobody can claim one by signing up.
    if (isPlatformAdmin(cleanEmail)) {
      return NextResponse.json({ error: 'This email cannot be used to register a restaurant' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const slug =
      restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Math.floor(1000 + Math.random() * 9000)

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name: restaurantName, slug },
      })

      const location = await tx.location.create({
        data: {
          restaurantId: restaurant.id,
          name: locationName,
          phone: phone ?? null,
        },
      })

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          email: cleanEmail,
          name: ownerName,
          passwordHash,
          role: 'OWNER',
        },
      })

      await tx.employee.create({
        data: {
          locationId: location.id,
          userId: user.id,
          jobTitle: 'Owner & General Manager',
          phone: phone ?? null,
          isActive: true,
        },
      })

      return { restaurant, location, user }
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Restaurant account created.',
        restaurant: {
          id: result.restaurant.id,
          name: result.restaurant.name,
          slug: result.restaurant.slug,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
