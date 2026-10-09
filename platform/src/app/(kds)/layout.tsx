import { UnifiedAppShell } from '@/components/layout/UnifiedAppShell'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export default async function KdsLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login?portal=kitchen')

  // Authorized roles for KDS
  const allowed = ['OWNER', 'MANAGER', 'KITCHEN', 'SERVER', 'HOST']
  if (!allowed.includes(session.user.role)) redirect('/dashboard')

  return <UnifiedAppShell>{children}</UnifiedAppShell>
}
