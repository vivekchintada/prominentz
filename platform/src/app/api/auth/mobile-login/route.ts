import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown-ip'
    const rl = await rateLimit(`auth:mobile-login:${ip}`, 10, 60)
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSec)
    }

    const { email, password } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    const emailRl = await rateLimit(`auth:mobile-login:${cleanEmail}`, 5, 60)
    if (!emailRl.allowed) {
      return rateLimitResponse(emailRl.retryAfterSec)
    }

    // Query user with location & restaurant details
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
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

    if (user && user.isActive) {
      let isPasswordValid = false
      if (password && user.passwordHash) {
        try {
          isPasswordValid = await bcrypt.compare(password, user.passwordHash)
        } catch {}
      }

      if (isPasswordValid) {
        const locationId = user.employee?.locationId || user.restaurant?.locations?.[0]?.id || ''
        const locationName = user.employee?.location?.name || user.restaurant?.locations?.[0]?.name || 'Main Dining Room'
        const timestamp = Date.now()
        const secret = process.env.NEXTAUTH_SECRET || 'resto_auth_secret_production_key_32_characters'
        const sig = crypto.createHmac('sha256', secret).update(`${user.id}_${timestamp}`).digest('hex')

        return NextResponse.json({
          success: true,
          token: `mobile_jwt_${user.id}_${timestamp}_${sig}`,
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
      }
    }

    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch (error: any) {
    console.error('[POST /api/auth/mobile-login]', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server authentication error' },
      { status: 500 }
    )
  }
}
