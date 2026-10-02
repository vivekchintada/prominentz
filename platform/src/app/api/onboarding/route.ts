import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ─── GET /api/onboarding ──────────────────────────────────────────────────────
// Returns current onboarding step and any existing data
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    // Ensure core operational staff roles (Manager, Server, Kitchen) exist for this restaurant
    const location = await prisma.location.findFirst({
      where: { restaurantId },
      orderBy: { isHeadquarters: 'desc' },
    })

    if (location) {
      const existingStaff = await prisma.user.findMany({
        where: {
          restaurantId,
          role: { in: ['MANAGER', 'SERVER', 'KITCHEN'] },
        },
        select: { role: true },
      })
      const existingRoles = new Set(existingStaff.map((u) => u.role))

      const r = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { name: true, slug: true },
      })
      const rSlug = r?.slug || `store-${restaurantId.slice(-6)}`
      const rName = r?.name || 'Restaurant'

      const bcrypt = await import('bcryptjs')
      const defaultHash = await bcrypt.hash('resto123', 10)

      if (!existingRoles.has('MANAGER')) {
        const u = await prisma.user.create({
          data: {
            restaurantId,
            email: `manager.${rSlug}@resto.app`,
            name: `${rName} Manager`,
            passwordHash: defaultHash,
            role: 'MANAGER',
          },
        })
        await prisma.employee.create({
          data: { locationId: location.id, userId: u.id, jobTitle: 'Store Operations Manager', isActive: true },
        })
      }

      if (!existingRoles.has('SERVER')) {
        const u = await prisma.user.create({
          data: {
            restaurantId,
            email: `server.${rSlug}@resto.app`,
            name: `${rName} Server`,
            passwordHash: defaultHash,
            role: 'SERVER',
          },
        })
        await prisma.employee.create({
          data: { locationId: location.id, userId: u.id, jobTitle: 'Floor Server / Waiter', isActive: true },
        })
      }

      if (!existingRoles.has('KITCHEN')) {
        const u = await prisma.user.create({
          data: {
            restaurantId,
            email: `kitchen.${rSlug}@resto.app`,
            name: `${rName} Kitchen`,
            passwordHash: defaultHash,
            role: 'KITCHEN',
          },
        })
        await prisma.employee.create({
          data: { locationId: location.id, userId: u.id, jobTitle: 'Kitchen Chef / KDS Line', isActive: true },
        })
      }
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
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
    if (!['OWNER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
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
        // Core staff roles (Manager, Server, Kitchen) customization & additional staff invite
        const { members, memberName, memberEmail, memberRole, memberPassword } = data as any
        const bcrypt = await import('bcryptjs')

        const memberList: Array<{ name?: string; email?: string; role?: string; password?: string }> = Array.isArray(members)
          ? members
          : memberName && memberEmail
          ? [{ name: memberName, email: memberEmail, role: memberRole, password: memberPassword }]
          : []

        const location = await prisma.location.findFirst({ where: { restaurantId } })

        for (const m of memberList) {
          if (m.name && m.email) {
            const cleanEmail = m.email.trim().toLowerCase()
            const role = (['MANAGER', 'SERVER', 'KITCHEN'].includes(m.role || '') ? m.role : 'SERVER') as any
            const hash = m.password ? await bcrypt.hash(m.password, 10) : await bcrypt.hash('resto123', 10)

            const u = await prisma.user.upsert({
              where: { email: cleanEmail },
              create: {
                restaurantId,
                name: m.name.trim(),
                email: cleanEmail,
                passwordHash: hash,
                role,
              },
              update: {
                name: m.name.trim(),
                role,
                ...(m.password ? { passwordHash: hash } : {}),
              },
            })

            if (location) {
              const existingEmp = await prisma.employee.findFirst({ where: { userId: u.id } })
              if (!existingEmp) {
                await prisma.employee.create({
                  data: {
                    locationId: location.id,
                    userId: u.id,
                    jobTitle: role === 'MANAGER' ? 'Operations Manager' : role === 'KITCHEN' ? 'Kitchen Chef' : 'Floor Server',
                    isActive: true,
                  },
                })
              }
            }
          }
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
