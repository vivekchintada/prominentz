import SidebarNav from '@/components/layout/SidebarNav'
import TopBar from '@/components/layout/TopBar'
import { SidebarCollapseProvider } from '@/components/layout/SidebarCollapseContext'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { PlanTier } from '@/lib/plans'

export default async function KdsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const userRole = session?.user?.role
  const userName = session?.user?.name ?? ''
  const userImage = session?.user?.image ?? null

  const userInitials =
    userName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

  let planTier: PlanTier = 'ENTERPRISE'
  let restaurantName = 'Streak House'

  try {
    let restaurantId = session?.user?.restaurantId
    if (!restaurantId) {
      const fb = await prisma.restaurant.findFirst()
      restaurantId = fb?.id
    }
    if (restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { planTier: true, name: true },
      })
      if (restaurant?.planTier) planTier = restaurant.planTier as PlanTier
      if (restaurant?.name) restaurantName = restaurant.name
    }
  } catch {}

  return (
    <SidebarCollapseProvider>
      <div className="app-shell app-shell--vertical">
        <TopBar
          restaurantName={restaurantName}
          userInitials={userInitials}
          userImage={userImage}
        />
        <div className="app-shell__body">
          <aside className="sidebar-shell">
            <SidebarNav planTier={planTier} userRole={userRole} />
          </aside>
          <main className="main-content" style={{ overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </SidebarCollapseProvider>
  )
}
