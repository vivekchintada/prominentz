import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { canManageBilling, getAuthContext } from '@/lib/auth/permissions'
import { prisma } from '@/lib/prisma'
import { cancelDodoSubscription, isDodoSettingsFromCurrentMode, resumeDodoSubscription } from '@/lib/dodo-payments'
import { stripe, isMockStripe } from '@/lib/stripe'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * POST {}               → cancel at the end of the current paid period (Dodo)
 * POST { resume: true } → undo a pending end-of-period cancellation (Dodo)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const authCtx = await getAuthContext(session.user)
    if (!authCtx || !canManageBilling(authCtx)) {
      return NextResponse.json({ error: 'Only the restaurant owner can manage billing' }, { status: 403 })
    }

    const restaurantId = session.user.restaurantId
    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant not found for user' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const resume = body?.resume === true

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    const currentSettings = (restaurant.settings as Record<string, any>) || {}
    const dodoSubscriptionId: string | undefined = currentSettings.dodoSubscriptionId

    // A subscription left over from Dodo test mode doesn't exist in live mode: nothing to cancel.
    if (dodoSubscriptionId && !isDodoSettingsFromCurrentMode(currentSettings)) {
      return NextResponse.json({ error: 'There is no active subscription to change.' }, { status: 400 })
    }

    if (dodoSubscriptionId) {
      try {
        if (resume) await resumeDodoSubscription(dodoSubscriptionId)
        else await cancelDodoSubscription(dodoSubscriptionId)
      } catch (err: any) {
        console.error('[POST /api/billing/cancel] Dodo request failed:', err.message)
        return NextResponse.json(
          { error: 'Could not update your subscription with Dodo Payments. Nothing was changed; please try again.' },
          { status: 502 }
        )
      }

      // Access continues until the period ends; Dodo sends subscription.cancelled then.
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { settings: { ...currentSettings, dodoCancelAtPeriodEnd: !resume } },
      })

      await logAuditEvent({
        restaurantId,
        actorId: session.user.id || 'owner',
        actorName: session.user.name || 'Owner',
        action: resume ? 'EDIT_SETTINGS' : 'BILLING_SUBSCRIPTION_CANCELLED',
        targetType: 'Restaurant',
        targetId: restaurantId,
        before: { subscriptionId: dodoSubscriptionId, cancelAtPeriodEnd: Boolean(currentSettings.dodoCancelAtPeriodEnd) },
        after: { cancelAtPeriodEnd: !resume },
      })

      return NextResponse.json({
        success: true,
        planTier: restaurant.planTier,
        cancelAtPeriodEnd: !resume,
        currentPeriodEnd: currentSettings.dodoNextBillingDate || null,
        message: resume
          ? 'Your subscription will keep renewing as normal.'
          : 'Your subscription is cancelled and will not renew. You keep full access until the end of the current billing period.',
      })
    }

    if (resume) {
      return NextResponse.json({ error: 'No Dodo subscription to resume' }, { status: 400 })
    }

    // Stripe-direct subscriptions (BILLING_PROVIDER=stripe local-testing override only).
    const subscriptionId = restaurant.stripeSubscriptionId
    if (subscriptionId && !isMockStripe()) {
      try {
        await stripe.subscriptions.cancel(subscriptionId)
      } catch (err: any) {
        console.error('[POST /api/billing/cancel] Stripe cancellation failed:', err.message)
        return NextResponse.json({ error: 'Could not cancel the subscription with Stripe' }, { status: 502 })
      }
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        planTier: 'STARTER',
        settings: { ...currentSettings, stripeSubscriptionStatus: 'CANCELLED' },
      },
    })

    await logAuditEvent({
      restaurantId,
      actorId: session.user.id || 'owner',
      actorName: session.user.name || 'Owner',
      action: 'BILLING_SUBSCRIPTION_CANCELLED',
      targetType: 'Restaurant',
      targetId: restaurantId,
      before: { planTier: restaurant.planTier, subscriptionId },
      after: { planTier: 'STARTER', status: 'CANCELLED' },
    })

    return NextResponse.json({
      success: true,
      planTier: updatedRestaurant.planTier,
      message: 'Subscription cancelled.',
    })
  } catch (error: any) {
    console.error('[POST /api/billing/cancel Error]', error)
    return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 })
  }
}
