import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { publishEvent } from '@/lib/redis'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { action, managerNote } = body // action: 'ACCEPT_PEER' | 'APPROVE' | 'DENY' | 'CANCEL'
    const restaurantId = session.user.restaurantId
    const isManager = session.user.role === 'MANAGER' || session.user.role === 'OWNER'

    const trade = await prisma.shiftTradeRequest.findFirst({
      where: { id, shift: { location: { restaurantId } } },
      include: { shift: true },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Shift trade request not found' }, { status: 404 })
    }

    const userEmp = await prisma.employee.findFirst({
      where: { userId: session.user.id, location: { restaurantId } },
    })

    let updatedTrade: any = null

    if (action === 'ACCEPT_PEER') {
      // The coworker taking the shift accepts it themselves; it then waits for a manager.
      if (!userEmp) {
        return NextResponse.json({ error: 'Coworker employee record required' }, { status: 400 })
      }
      if (trade.status !== 'PENDING_PEER') {
        return NextResponse.json({ error: 'This trade is no longer open' }, { status: 409 })
      }
      if (userEmp.id === trade.requesterId) {
        return NextResponse.json({ error: 'You cannot accept your own trade' }, { status: 400 })
      }
      if (trade.targetEmployeeId && trade.targetEmployeeId !== userEmp.id) {
        return NextResponse.json({ error: 'This trade was offered to someone else' }, { status: 403 })
      }

      updatedTrade = await prisma.shiftTradeRequest.update({
        where: { id },
        data: {
          targetEmployeeId: userEmp.id,
          status: 'PENDING_MANAGER',
        },
      })
    } else if (action === 'APPROVE') {
      if (!isManager) {
        return NextResponse.json({ error: 'Only managers can approve shift trades' }, { status: 403 })
      }
      if (!['PENDING_PEER', 'PENDING_MANAGER'].includes(trade.status)) {
        return NextResponse.json({ error: 'This trade has already been resolved' }, { status: 409 })
      }

      const newOwnerEmployeeId = trade.targetEmployeeId || body.assignToEmployeeId
      if (!newOwnerEmployeeId) {
        return NextResponse.json({ error: 'No target employee assigned to receive shift' }, { status: 400 })
      }
      const newOwner = await prisma.employee.findFirst({
        where: { id: String(newOwnerEmployeeId), location: { restaurantId } },
        select: { id: true },
      })
      if (!newOwner) {
        return NextResponse.json({ error: 'Target employee not found in this restaurant' }, { status: 400 })
      }

      const [, approved] = await prisma.$transaction([
        prisma.shift.update({ where: { id: trade.shiftId }, data: { employeeId: newOwner.id } }),
        prisma.shiftTradeRequest.update({
          where: { id },
          data: { status: 'APPROVED', targetEmployeeId: newOwner.id, managerNote: managerNote || 'Approved by manager' },
        }),
      ])
      updatedTrade = approved
    } else if (action === 'DENY') {
      if (!isManager) {
        return NextResponse.json({ error: 'Only managers can deny shift trades' }, { status: 403 })
      }

      updatedTrade = await prisma.shiftTradeRequest.update({
        where: { id },
        data: {
          status: 'DENIED',
          managerNote: managerNote || 'Denied by manager',
        },
      })
    } else if (action === 'CANCEL') {
      if (!isManager && userEmp?.id !== trade.requesterId) {
        return NextResponse.json({ error: 'Only the requester or a manager can cancel this trade' }, { status: 403 })
      }
      updatedTrade = await prisma.shiftTradeRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    try {
      await publishEvent(
        'swap.resolved',
        {
          tradeId: id,
          action,
          status: updatedTrade?.status,
          shiftId: trade.shiftId,
        },
        trade.shift.locationId
      )
    } catch {}

    return NextResponse.json(updatedTrade)
  } catch (error) {
    console.error('[PATCH /api/shifts/swap/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
