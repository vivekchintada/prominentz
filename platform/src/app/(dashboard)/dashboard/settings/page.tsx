import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/dashboard/SettingsClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = {
  title: 'Settings | Prominentz',
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="General Settings"
        showRefresh
        subtitle="Manage store details, tax rates, thermal receipt printers, payment types, and delivery preferences"
      />
      <div className="page-body">
        <SettingsClient />
      </div>
    </>
  )
}
