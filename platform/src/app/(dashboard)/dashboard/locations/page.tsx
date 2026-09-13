import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { MultiLocationClient } from '@/components/dashboard/MultiLocationClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = {
  title: 'Multi-Location Command Center | Resto AI',
}

export default async function MultiLocationPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Multi-Location Outlets"
        showRefresh
        subtitle="Manage cross-branch restaurant menus, staffing, and revenue synchronization"
        actions={
          <button className="btn btn--primary btn--sm">+ Add Location</button>
        }
      />
      <div className="page-body">
        <MultiLocationClient />
      </div>
    </>
  )
}
