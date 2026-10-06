import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/PageHeader'

const StaffManagementClient = dynamic(
  () => import('@/components/dashboard/StaffManagementClient').then((mod) => mod.StaffManagementClient),
  {
    loading: () => (
      <div className="flex items-center justify-center p-12 text-secondary">
        <div className="spinner" />
        <span className="ml-3 text-sm">Loading Staff Management...</span>
      </div>
    ),
  }
)

export const metadata = {
  title: 'Staff & Delegated Access | Prominentz',
}

export default async function StaffManagementPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Staff & Access Control"
        showRefresh
        subtitle="Manage delegated team roles, multi-location assignments, and single-use staff invitations"
      />
      <div className="page-body">
        <StaffManagementClient />
      </div>
    </>
  )
}
