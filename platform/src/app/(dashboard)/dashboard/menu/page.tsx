import { auth } from '@/auth'
import MenuManagementClient from '@/components/menu/MenuManagementClient'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Suspense } from 'react'

export const metadata = { title: 'Menu Management | Prominentz' }

export default async function DashboardMenuPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const user = session.user

  // Ensure owner/manager role
  if (!['OWNER', 'MANAGER'].includes(user.role)) {
    return (
      <>
        <PageHeader title="Access Denied" />
        <div className="page-body">
          <div className="card card--elevated flex flex-col gap-4" style={{ maxWidth: '500px', margin: '40px auto', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🚫</span>
            <h2 className="text-xl font-bold">Manager Role Required</h2>
            <p className="text-secondary">
              You are logged in as a <strong>{user.role}</strong>. Only owners and managers can access Menu Management.
            </p>
            <div className="divider" style={{ width: '100%' }} />
            <Link href="/dashboard" className="btn btn--primary">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Menu Management...</div>}>
        <MenuManagementClient />
      </Suspense>
    </div>
  )
}
