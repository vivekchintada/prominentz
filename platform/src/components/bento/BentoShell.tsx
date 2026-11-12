import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { PlanTier } from '@/lib/plans'
import { getBentoNav } from '@/lib/bento-nav'
import { getAccessStatus, getRestaurantBasics } from '@/lib/bento/request-cache'
import { isPlatformAdmin } from '@/lib/hq/platform-admin'
import { OfflineBanner } from './OfflineBanner'
import { SubscriptionBanner } from '@/components/dashboard/SubscriptionBanner'
import { BentoTopBar } from './BentoTopBar'

/**
 * App frame for the back office: the white rounded top bar from the role boards,
 * with the six main sections and a "More" menu, over the light grey ground.
 */
export async function BentoShell({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user
  const userName = user.name ?? ''
  const userInitials =
    userName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  const [restaurant, access] = user.restaurantId
    ? await Promise.all([getRestaurantBasics(user.restaurantId), getAccessStatus(user.restaurantId)])
    : [null, null]
  const planTier: PlanTier = restaurant?.planTier ?? 'STARTER'
  const restaurantName = restaurant?.name || 'My restaurant'

  const { primary, more } = getBentoNav(user.role, planTier)

  return (
    <div className="bz">
      <div className="bz-wrap">
        <BentoTopBar
          primary={primary}
          more={more}
          restaurantName={restaurantName}
          userName={userName}
          userEmail={user.email ?? ''}
          userInitials={userInitials}
          planTier={planTier}
          hqHref={isPlatformAdmin(user.email) ? '/hq' : null}
        />
        <OfflineBanner />
        {access && (user.role === 'OWNER' || user.role === 'MANAGER') && (
          <SubscriptionBanner
            isTrialing={access.isTrialing}
            isExpired={access.isExpired}
            isPastDue={access.isPastDue}
            daysLeftInTrial={access.daysLeftInTrial}
          />
        )}
        <main id="main-content" className="bz-main">
          {children}
        </main>
      </div>
    </div>
  )
}
