import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import LaborClient from '@/components/dashboard/LaborClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Labor & Timesheets | Prominentz',
  description: 'Planned vs actual labor, payroll review, and labor efficiency',
}

export default async function LaborPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  return (
    <>
      <PageHeader
        title="Labor & Timesheets"
        subtitle="Compare scheduled labor with actual attendance, track overtime variance, and approve payroll-ready hours."
      />
      <div className="page-body">
        <LaborClient />
      </div>
    </>
  )
}
