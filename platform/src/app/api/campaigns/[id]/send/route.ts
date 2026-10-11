import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { dispatchMarketingCampaign } from '@/lib/campaign-providers'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const campaign = await prisma.marketingCampaign.findFirst({
      where: { id, restaurantId: session.user.restaurantId },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status === 'SENT') {
      return NextResponse.json({ error: 'Campaign has already been sent' }, { status: 400 })
    }

    const result = await dispatchMarketingCampaign(id)

    return NextResponse.json({
      success: true,
      sentCount: result.sentCount,
      totalTargeted: result.totalTargeted,
      campaign: result.campaign,
    })
  } catch (err: any) {
    console.error('[POST /api/campaigns/:id/send]', err)
    return NextResponse.json({ error: err?.message || 'Failed to dispatch campaign' }, { status: 500 })
  }
}
