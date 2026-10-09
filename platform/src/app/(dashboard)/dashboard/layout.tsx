import { UnifiedAppShell } from '@/components/layout/UnifiedAppShell'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

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

  return <UnifiedAppShell>{children}</UnifiedAppShell>
}
