import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { setTableStatus } from '@/lib/tables'
import { publishEvent, EVENTS } from '@/lib/redis'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(req, params)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(req, params)
}

async function handleUpdate(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>,
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await paramsPromise
    const body = await req.json()
    const { status, capacity, name, note, floor, shape } = body

    // Find the table and make sure it belongs to the user's restaurant
    const table = await prisma.table.findFirst({
      where: {
        id,
        location: { restaurantId: session.user.restaurantId },
      },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Protect active tables with active orders from manual overrides to EMPTY/RESERVED unless forced
    if (status && status !== table.status) {
      if (
        ['ACTIVE', 'PAYING'].includes(table.status) &&
        ['EMPTY', 'RESERVED'].includes(status) &&
        !body.force
      ) {
        return NextResponse.json(
          {
            error:
              'Cannot manually release table with an active order. Please void or settle the order first.',
          },
          { status: 409 },
        )
      }

      await setTableStatus(id, status, session.user.id)
    }

    // Update fields if provided
    const updatedTable = await prisma.table.update({
      where: { id },
      data: {
        ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(floor !== undefined ? { floor: String(floor).trim() } : {}),
        ...(shape !== undefined ? { shape: String(shape).trim() } : {}),
        ...(note !== undefined ? { note: note === null ? null : String(note) } : {}),
      },
    })

    if (note !== undefined) {
      await publishEvent(EVENTS.TABLE_NOTE_CHANGED, {
        tableId: id,
        tableName: updatedTable.name,
        note: updatedTable.note,
        actorId: session.user.id,
      })
    }

    return NextResponse.json(updatedTable)
  } catch (error) {
    console.error('[PUT/PATCH /api/tables/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const table = await prisma.table.findFirst({
      where: {
        id,
        location: { restaurantId: session.user.restaurantId },
      },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'SENT_TO_KITCHEN', 'HOLD', 'PARTIALLY_READY', 'READY'] } },
        },
      },
    })

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    if (table.orders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete table with active open orders. Settle or cancel orders first.' },
        { status: 400 },
      )
    }

    await prisma.table.delete({ where: { id } })

    return NextResponse.json({ success: true, message: `Table "${table.name}" deleted` })
  } catch (error: unknown) {
    console.error('[DELETE /api/tables/:id]', error)
    return NextResponse.json({ error: error.message || 'Failed to delete table' }, { status: 500 })
  }
}
