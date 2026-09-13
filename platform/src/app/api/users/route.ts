import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/audit'

const createUserSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(6).max(100),
  role:     z.enum(['OWNER', 'MANAGER', 'SERVER', 'KITCHEN']),
})

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Fetches all users for the user's restaurant
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: { restaurantId: session.user.restaurantId },
      select: {
        id:    true,
        name:  true,
        email: true,
        role:  true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('[GET /api/users]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/users ──────────────────────────────────────────────────────────
// Creates a new user profile under this restaurant
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, password, role } = parsed.data

    // Check if email already exists
    const existing = await prisma.user.findFirst({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        restaurantId: session.user.restaurantId,
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id:    true,
        name:  true,
        email: true,
        role:  true,
      },
    })

    // Audit log
    await logAuditEvent({
      restaurantId: session.user.restaurantId,
      actorId:      session.user.id,
      actorName:    session.user.name ?? 'Unknown',
      action:       'CREATE_USER',
      targetType:   'User',
      targetId:     newUser.id,
      after: { name: newUser.name, email: newUser.email, role: newUser.role },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('[POST /api/users]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
