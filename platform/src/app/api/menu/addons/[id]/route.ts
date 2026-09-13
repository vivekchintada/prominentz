import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateAddonSchema } from '@/lib/validations/menu'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateAddonSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.menuAddon.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 })
    }

    const updated = await prisma.menuAddon.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/menu/addons/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.menuAddon.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Addon not found' }, { status: 404 })
    }

    await prisma.menuAddon.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/menu/addons/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
