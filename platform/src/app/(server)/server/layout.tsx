import { UnifiedAppShell } from '@/components/layout/UnifiedAppShell'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export default async function ServerDashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login?portal=server')

  // Only SERVER role (and above for support/testing)
  const allowed = ['SERVER', 'MANAGER', 'OWNER', 'HOST']
  if (!allowed.includes(session.user.role)) redirect('/dashboard')

  return <UnifiedAppShell>{children}</UnifiedAppShell>
}
