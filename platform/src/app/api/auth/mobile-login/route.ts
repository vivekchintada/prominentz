import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { issueMobileToken } from '@/lib/auth/mobile-token'
import bcrypt from 'bcryptjs'

// Compared against when the email is unknown or the account can't sign in, so every miss takes as
// long as a wrong password and response timing doesn't reveal which emails have accounts.
const TIMING_EQUALIZER_HASH = bcrypt.hashSync('prominentz-timing-equalizer', 10)

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown-ip'
    const rl = await rateLimit(`auth:mobile-login:${ip}`, 10, 60)
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSec)
    }

    const { email, password } = await req.json().catch(() => ({}))
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    const emailRl = await rateLimit(`auth:mobile-login:${cleanEmail}`, 5, 60)
    if (!emailRl.allowed) {
      return rateLimitResponse(emailRl.retryAfterSec)
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      include: {
        restaurant: {
          include: {
            locations: {
              take: 1,
              orderBy: { isHeadquarters: 'desc' },
            },
          },
        },
        employee: {
          select: {
            locationId: true,
            jobTitle: true,
            location: { select: { id: true, name: true } },
          },
        },
      },
    })

    const canSignIn = Boolean(user?.isActive && user.passwordHash)
    const passwordsMatch = await bcrypt
      .compare(typeof password === 'string' ? password : '', canSignIn ? user!.passwordHash : TIMING_EQUALIZER_HASH)
      .catch(() => false)

    if (!user || !canSignIn || !passwordsMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('[POST /api/auth/mobile-login] NEXTAUTH_SECRET is not configured')
      return NextResponse.json({ error: 'Authentication service is not configured' }, { status: 503 })
    }

    const locationId = user.employee?.locationId || user.restaurant?.locations?.[0]?.id || ''
    const locationName = user.employee?.location?.name || user.restaurant?.locations?.[0]?.name || 'Main Dining Room'

    return NextResponse.json({
      success: true,
      token: issueMobileToken(user, secret),
      user: {
        id: user.id,
        name: user.name || 'Staff Member',
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurantName: user.restaurant?.name || 'Restaurant',
        locationId,
        locationName,
      },
    })
  } catch (error) {
    console.error('[POST /api/auth/mobile-login]', error)
    return NextResponse.json({ error: 'Internal server authentication error' }, { status: 500 })
  }
}
