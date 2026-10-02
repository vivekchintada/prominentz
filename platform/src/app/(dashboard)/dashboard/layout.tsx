import SidebarNav from '@/components/layout/SidebarNav'
import TopBar from '@/components/layout/TopBar'
import { SidebarCollapseProvider } from '@/components/layout/SidebarCollapseContext'
import { RestoIQAssistant } from '@/components/dashboard/RestoIQAssistant'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PlanTier } from '@/lib/plans'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Strict Role Gate: Server and Kitchen staff have dedicated operational workspaces
  if (session.user.role === 'SERVER') {
    redirect('/server')
  }
  if (session.user.role === 'KITCHEN') {
    redirect('/kds')
  }

  const userRole = session.user.role
  const userName = session.user.name ?? ''
  const userImage = session.user.image ?? null

  // Build user initials from name
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  // Resolve the restaurant's active plan tier
  let planTier: PlanTier = 'STARTER'
  let restaurantName = 'My Restaurant'

  try {
    let restaurantId: string | undefined = session?.user?.restaurantId
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
  } catch {
    // Fallback on any error
  }

  return (
    <SidebarCollapseProvider>
      {/* Vertical flex: TopBar stacked above body */}
      <div className="app-shell app-shell--vertical">
        {/* ── Fixed top bar ── */}
        <TopBar
          restaurantName={restaurantName}
          userInitials={userInitials}
          userImage={userImage}
        />

        {/* ── Horizontal body: sidebar + main content ── */}
        <div className="app-shell__body">
          {/* Sidebar: icon rail always visible, text panel collapses */}
          <aside className="sidebar-shell">
            <SidebarNav planTier={planTier} userRole={userRole} />
          </aside>

          {/* Main content */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </SidebarCollapseProvider>
  )
}
