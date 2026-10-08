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
    const { action, targetEmployeeId, managerNote } = body // action: 'ACCEPT_PEER' | 'APPROVE' | 'DENY' | 'CANCEL'

    const trade = await prisma.shiftTradeRequest.findUnique({
      where: { id },
      include: {
        shift: true,
      },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Shift trade request not found' }, { status: 404 })
    }

    const userEmp = await prisma.employee.findFirst({
      where: { userId: session.user.id },
    })

    let updatedTrade: unknown = null

    if (action === 'ACCEPT_PEER') {
      // Coworker accepts open/offered shift trade -> moves to PENDING_MANAGER
      const acceptorId = targetEmployeeId || userEmp?.id
      if (!acceptorId) {
        return NextResponse.json({ error: 'Coworker employee record required' }, { status: 400 })
      }

      updatedTrade = await prisma.shiftTradeRequest.update({
        where: { id },
        data: {
          targetEmployeeId: acceptorId,
          status: 'PENDING_MANAGER',
        },
      })
    } else if (action === 'APPROVE') {
      // Manager approves trade request -> Transfer shift to new worker!
      if (session.user.role !== 'MANAGER' && session.user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only managers can approve shift trades' }, { status: 403 })
      }

      const newOwnerEmployeeId = trade.targetEmployeeId || body.assignToEmployeeId

      if (!newOwnerEmployeeId) {
        return NextResponse.json({ error: 'No target employee assigned to receive shift' }, { status: 400 })
      }

      // 1. Re-assign shift to new employee
      await prisma.shift.update({
        where: { id: trade.shiftId },
        data: {
          employeeId: newOwnerEmployeeId,
        },
      })

      // 2. Mark trade request APPROVED
      updatedTrade = await prisma.shiftTradeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          managerNote: managerNote || 'Approved by manager',
        },
      })
    } else if (action === 'DENY') {
      if (session.user.role !== 'MANAGER' && session.user.role !== 'OWNER') {
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
