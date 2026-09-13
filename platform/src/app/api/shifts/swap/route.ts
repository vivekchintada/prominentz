import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const trades = await prisma.shiftTradeRequest.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        shift: {
          location: { restaurantId: session.user.restaurantId },
        },
      },
      include: {
        shift: {
          include: {
            employee: {
              include: { user: { select: { name: true, email: true, role: true } } },
            },
          },
        },
        requester: {
          include: { user: { select: { name: true, email: true, role: true } } },
        },
        targetEmployee: {
          include: { user: { select: { name: true, email: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error('[GET /api/shifts/swap]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { shiftId, targetEmployeeId, reason } = body

    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    // Find shift and requester employee
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employee: true },
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const requesterEmp = await prisma.employee.findFirst({
      where: { userId: session.user.id },
    })

    if (!requesterEmp) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }

    // Verify requester owns shift or is manager/owner
    if (shift.employeeId !== requesterEmp.id && session.user.role !== 'MANAGER' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'You can only offer your own shifts for trade' }, { status: 403 })
    }

    // Create trade request
    const trade = await prisma.shiftTradeRequest.create({
      data: {
        shiftId,
        requesterId: requesterEmp.id,
        targetEmployeeId: targetEmployeeId || null,
        reason: reason || null,
        status: targetEmployeeId ? 'PENDING_PEER' : 'PENDING_MANAGER', // If open pool, straight to manager approval
      },
      include: {
        shift: true,
        requester: { include: { user: true } },
        targetEmployee: { include: { user: true } },
      },
    })

    return NextResponse.json(trade, { status: 201 })
  } catch (error) {
    console.error('[POST /api/shifts/swap]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
