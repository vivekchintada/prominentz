import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import ReportsClient from '@/components/dashboard/ReportsClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = { title: 'Sales & Analytics | Prominentz' }

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  return (
    <>
      <PageHeader
        title="Sales & Analytics"
        showRefresh
        actions={
          <>
            <button className="btn btn--secondary btn--sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Export
            </button>
          </>
        }
      />
      <div className="page-body">
        <ReportsClient />
      </div>
    </>
  )
}
