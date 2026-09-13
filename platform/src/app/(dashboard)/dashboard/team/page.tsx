import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/PageHeader'

const TeamClient = dynamic(() => import('@/components/dashboard/TeamClient'), {
  loading: () => (
    <div className="flex items-center justify-center p-12 text-secondary">
      <div className="spinner" />
      <span className="ml-3 text-sm">Loading Staff & Labor Management...</span>
    </div>
  ),
})

export const metadata = { title: 'Staff & Labor Management | Resto AI' }

export default async function TeamPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  return (
    <>
      <PageHeader
        title="Staff & Labor Management"
        showRefresh
        actions={
          <>
            <button className="btn btn--secondary btn--sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Export
            </button>
            <button className="btn btn--primary btn--sm">+ Add Staff</button>
          </>
        }
      />
      <div className="page-body">
        <TeamClient />
      </div>
    </>
  )
}
