import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reviewSchema = z.object({
  status:     z.enum(['APPROVED', 'DENIED', 'CANCELLED']),
  reviewNote: z.string().max(500).optional(),
})

// ─── PATCH /api/leave/[id] ────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Load the request to verify ownership / permission
    const request = await prisma.leaveRequest.findFirst({
      where: { id },
      include: { employee: { select: { userId: true, location: { select: { restaurantId: true } } } } },
    })
    if (!request) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Verify this request belongs to this restaurant
    if (request.employee.location.restaurantId !== session.user.restaurantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isManager = ['OWNER', 'MANAGER'].includes(session.user.role)
    const isOwner   = request.employee.userId === session.user.id

    // Managers can approve/deny; employees can only cancel their own
    if (parsed.data.status === 'CANCELLED') {
      if (!isOwner && !isManager) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      // APPROVED or DENIED — manager only
      if (!isManager) {
        return NextResponse.json({ error: 'Forbidden — only managers can approve or deny requests' }, { status: 403 })
      }
    }

    // Can only act on PENDING requests (except cancel your own)
    if (request.status !== 'PENDING' && !(parsed.data.status === 'CANCELLED' && isOwner)) {
      return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 409 })
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status:     parsed.data.status,
        reviewedBy: parsed.data.status !== 'CANCELLED' ? session.user.id : undefined,
        reviewNote: parsed.data.reviewNote ?? null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/leave/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
