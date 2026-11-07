import { Platform } from 'react-native'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui'
import { Api } from '../api/client'

/**
 * Restaurant subscriptions via RevenueCat (App Store / Google Play).
 * The RevenueCat app user ID is the restaurant ID, so the plan is shared by every
 * staff login of that restaurant and matches what the web dashboard sees.
 */

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
})

export function subscriptionsAvailable(): boolean {
  return Platform.OS !== 'web' && Boolean(API_KEY)
}

let configuredFor: string | null = null

/** Configure RevenueCat for this restaurant (or switch to it after a different login). */
export async function initSubscriptions(restaurantId?: string): Promise<void> {
  if (!subscriptionsAvailable() || !restaurantId || configuredFor === restaurantId) return

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN)

  if (await Purchases.isConfigured()) {
    await Purchases.logIn(restaurantId)
  } else {
    Purchases.configure({ apiKey: API_KEY!, appUserID: restaurantId })
  }
  configuredFor = restaurantId
}

/** Tell the server to re-check RevenueCat now so the new plan shows everywhere right away. */
async function syncPlanWithServer(): Promise<void> {
  await Api.request('/api/billing/sync', { method: 'POST' })
}

export type PlanPurchaseResult = 'purchased' | 'cancelled' | 'unavailable' | 'error'

/** Show the RevenueCat paywall (plans are set up in the RevenueCat dashboard). */
export async function openPlans(restaurantId?: string): Promise<PlanPurchaseResult> {
  if (!subscriptionsAvailable()) return 'unavailable'
  try {
    await initSubscriptions(restaurantId)
    const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true })
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      await syncPlanWithServer()
      return 'purchased'
    }
    return result === PAYWALL_RESULT.CANCELLED ? 'cancelled' : 'error'
  } catch (e) {
    console.warn('[Subscriptions] paywall failed', e)
    return 'error'
  }
}

/** Manage, restore or cancel through RevenueCat's Customer Center. */
export async function manageSubscription(restaurantId?: string): Promise<boolean> {
  if (!subscriptionsAvailable()) return false
  try {
    await initSubscriptions(restaurantId)
    await RevenueCatUI.presentCustomerCenter()
    await syncPlanWithServer()
    return true
  } catch (e) {
    console.warn('[Subscriptions] customer center failed', e)
    return false
  }
}

/** True when the restaurant has any active plan entitlement. */
export async function hasActivePlan(restaurantId?: string): Promise<boolean> {
  if (!subscriptionsAvailable()) return false
  await initSubscriptions(restaurantId)
  const info = await Purchases.getCustomerInfo()
  return Object.keys(info.entitlements.active).length > 0
}
