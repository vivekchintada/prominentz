import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSegmentRecipients } from '@/lib/campaign-providers'
import { CampaignChannel, CampaignSegment } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) return NextResponse.json({ campaigns: [] })

    const restaurantId = session.user.restaurantId

    const campaigns = await prisma.marketingCampaign.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ campaigns })
  } catch (err) {
    console.error('[GET /api/campaigns]', err)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role && !['OWNER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { title, channel, targetSegment, subject, messageBody, couponId } = await req.json()

    if (!title?.trim() || !messageBody?.trim()) {
      return NextResponse.json({ error: 'Campaign title and message body are required' }, { status: 400 })
    }

    // Preview recipient count respecting consent
    const { eligible } = await getSegmentRecipients({
      restaurantId: session.user.restaurantId,
      segment: (targetSegment || 'ALL') as CampaignSegment,
      channel: (channel || 'EMAIL') as CampaignChannel,
    })

    const campaign = await prisma.marketingCampaign.create({
      data: {
        restaurantId: session.user.restaurantId,
        title: title.trim(),
        channel: (channel || 'EMAIL') as CampaignChannel,
        targetSegment: (targetSegment || 'ALL') as CampaignSegment,
        subject: subject?.trim() || null,
        messageBody: messageBody.trim(),
        couponId: couponId || null,
        status: 'DRAFT',
        recipientCount: eligible.length,
      },
    })

    return NextResponse.json({ campaign, eligibleRecipients: eligible.length }, { status: 201 })
  } catch (err: unknown) {
    console.error('[POST /api/campaigns]', err)
    return NextResponse.json({ error: err?.message || 'Failed to create campaign' }, { status: 500 })
  }
}
