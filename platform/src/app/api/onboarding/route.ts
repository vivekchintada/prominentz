import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/onboarding ──────────────────────────────────────────────────────
// Returns current onboarding step and any existing data
export async function GET() {
  try {
    const session = await auth()
    let restaurantId = session?.user?.restaurantId
    if (!restaurantId) {
      const fb = await prisma.restaurant.findFirst()
      restaurantId = fb?.id ?? ''
    }
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        onboardingStep: true,
        planTier: true,
        locations: {
          take: 1,
          select: { id: true, name: true, address: true, phone: true, timezone: true },
        },
        users: {
          where: { role: { not: 'OWNER' } },
          select: { id: true, name: true, email: true, role: true },
          take: 10,
        },
      },
    })

    return NextResponse.json(restaurant)
  } catch (error) {
    console.error('[GET /api/onboarding]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/onboarding ─────────────────────────────────────────────────────
// Advances the onboarding wizard to the next step
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let restaurantId = session.user.restaurantId
    if (!restaurantId) {
      const fb = await prisma.restaurant.findFirst()
      restaurantId = fb?.id ?? ''
    }
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const body = await req.json()
    const { step, data } = body as { step: number; data: Record<string, unknown> }

    if (typeof step !== 'number' || step < 1 || step > 6) {
      return NextResponse.json({ error: 'Invalid step number (1–6)' }, { status: 400 })
    }

    // Per-step logic
    switch (step) {
      case 1: {
        // Restaurant name
        const { name } = data as { name: string }
        if (!name?.trim()) return NextResponse.json({ error: 'Restaurant name required' }, { status: 400 })
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { name: name.trim(), onboardingStep: 1 },
        })
        break
      }
      case 2: {
        // First location setup
        const { locationName, address, phone, timezone } = data as Record<string, string>
        if (!locationName?.trim()) return NextResponse.json({ error: 'Location name required' }, { status: 400 })

        const existing = await prisma.location.findFirst({ where: { restaurantId } })
        if (existing) {
          await prisma.location.update({
            where: { id: existing.id },
            data: {
              name: locationName.trim(),
              address: address || null,
              phone: phone || null,
              timezone: timezone || 'UTC',
              isHeadquarters: true,
            },
          })
        } else {
          await prisma.location.create({
            data: {
              restaurantId,
              name: locationName.trim(),
              address: address || null,
              phone: phone || null,
              timezone: timezone || 'UTC',
              isHeadquarters: true,
            },
          })
        }
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { onboardingStep: 2 },
        })
        break
      }
      case 3: {
        // Invite team member (optional step — skip is valid)
        const { memberName, memberEmail, memberRole, memberPassword } = data as Record<string, string>
        if (memberName && memberEmail && memberPassword) {
          const bcrypt = await import('bcryptjs')
          const hash = await bcrypt.hash(memberPassword, 10)
          await prisma.user.upsert({
            where: { email: memberEmail },
            create: {
              restaurantId,
              name: memberName,
              email: memberEmail,
              passwordHash: hash,
              role: (memberRole as any) || 'SERVER',
            },
            update: {},
          })
        }
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { onboardingStep: 3 },
        })
        break
      }
      case 4: {
        // Menu template seed — handled by /api/onboarding/seed-menu
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { onboardingStep: 4 },
        })
        break
      }
      case 5: {
        // Table layout — add tables from wizard
        const { tables } = data as { tables: Array<{ name: string; capacity: number }> }
        const location = await prisma.location.findFirst({ where: { restaurantId } })
        if (location && Array.isArray(tables) && tables.length > 0) {
          await prisma.table.createMany({
            data: tables.map((t, i) => ({
              locationId: location.id,
              name: t.name.trim() || `Table ${i + 1}`,
              capacity: Number(t.capacity) || 4,
            })),
            skipDuplicates: true,
          })
        }
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { onboardingStep: 5 },
        })
        break
      }
      case 6: {
        // Final — mark complete
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { onboardingStep: 6 },
        })
        break
      }
    }

    return NextResponse.json({ success: true, step })
  } catch (error) {
    console.error('[POST /api/onboarding]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
