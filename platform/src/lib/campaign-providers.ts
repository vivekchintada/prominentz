import { prisma } from '@/lib/prisma'
import { CampaignChannel, CampaignSegment } from '@prisma/client'

export interface CampaignRecipient {
  id: string
  name: string
  email?: string | null
  phone: string
  marketingConsentEmail: boolean
  marketingConsentSms: boolean
  marketingConsentWhatsApp: boolean
  pointsBalance: number
  lifetimeSpend: number
  totalVisits: number
}

/**
 * Evaluates audience recipients for a given campaign segment,
 * and strictly filters by communication channel consent.
 */
export async function getSegmentRecipients(params: {
  restaurantId: string
  segment: CampaignSegment
  channel: CampaignChannel
}): Promise<{ eligible: CampaignRecipient[]; totalInSegment: number }> {
  const { restaurantId, segment, channel } = params

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // Fetch all customers of restaurant
  const allCustomers = await prisma.customer.findMany({
    where: { restaurantId },
    orderBy: { createdAt: 'desc' },
  })

  // Filter based on segment rule
  const segmentFiltered = allCustomers.filter((c) => {
    switch (segment) {
      case 'NEW':
        return c.totalVisits <= 1 && c.createdAt >= thirtyDaysAgo
      case 'REPEAT':
        return c.totalVisits >= 2
      case 'HIGH_VALUE':
        return Number(c.lifetimeSpend) >= 200 || c.tierId !== null
      case 'LAPSED':
        return (
          c.totalVisits >= 1 &&
          (!c.lastVisitAt || c.lastVisitAt < sixtyDaysAgo)
        )
      case 'BIRTHDAY':
        if (!c.birthDate) return false
        return new Date(c.birthDate).getMonth() === now.getMonth()
      case 'DIETARY':
        return Array.isArray(c.allergyTags) && (c.allergyTags as any[]).length > 0
      case 'ALL':
      default:
        return true
    }
  })

  // Strictly enforce communication consent
  const eligible = segmentFiltered.filter((c) => {
    if (channel === 'EMAIL') {
      return Boolean(c.email && c.marketingConsentEmail)
    }
    if (channel === 'SMS') {
      return Boolean(c.phone && c.marketingConsentSms)
    }
    if (channel === 'WHATSAPP') {
      return Boolean(c.phone && c.marketingConsentWhatsApp)
    }
    return false
  }).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    marketingConsentEmail: c.marketingConsentEmail,
    marketingConsentSms: c.marketingConsentSms,
    marketingConsentWhatsApp: c.marketingConsentWhatsApp,
    pointsBalance: c.pointsBalance,
    lifetimeSpend: Number(c.lifetimeSpend),
    totalVisits: c.totalVisits,
  }))

  return { eligible, totalInSegment: segmentFiltered.length }
}

/**
 * Dispatches a campaign to eligible recipients with channel providers.
 */
export async function dispatchMarketingCampaign(campaignId: string) {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: campaignId },
    include: { restaurant: true },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  const { eligible } = await getSegmentRecipients({
    restaurantId: campaign.restaurantId,
    segment: campaign.targetSegment,
    channel: campaign.channel,
  })

  const restaurantName = campaign.restaurant.name

  // Deliver messages through channel adapters
  let sentCount = 0
  for (const recipient of eligible) {
    try {
      if (campaign.channel === 'EMAIL' && recipient.email) {
        if (process.env.RESEND_API_KEY) {
          const { Resend } = await import('resend')
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: process.env.EMAIL_FROM || `${restaurantName} <updates@restoai.com>`,
            to: recipient.email,
            subject: campaign.subject || `Special update from ${restaurantName}`,
            text: campaign.messageBody.replace(/{{name}}/g, recipient.name),
          })
        } else {
          console.log(`[Campaign Email Simulator] To: ${recipient.email} | Subject: ${campaign.subject} | Body: ${campaign.messageBody}`)
        }
        sentCount++
      } else if (campaign.channel === 'SMS' && recipient.phone) {
        console.log(`[Campaign SMS Simulator] To: ${recipient.phone} | Body: ${campaign.messageBody}`)
        sentCount++
      } else if (campaign.channel === 'WHATSAPP' && recipient.phone) {
        console.log(`[Campaign WhatsApp Simulator] To: ${recipient.phone} | Body: ${campaign.messageBody}`)
        sentCount++
      }
    } catch (deliveryErr) {
      console.error(`[Campaign Dispatch Error] Failed delivery to ${recipient.id}:`, deliveryErr)
    }
  }

  // Update campaign status
  const updatedCampaign = await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
      recipientCount: sentCount,
    },
  })

  return { success: true, sentCount, totalTargeted: eligible.length, campaign: updatedCampaign }
}
