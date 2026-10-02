import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { AuditLogClient } from '@/components/dashboard/AuditLogClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = {
  title: 'Audit Log | Prominentz',
}

export default async function AuditPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="Audit Log"
        showRefresh
        subtitle="Immutable compliance trail of all sensitive operations"
        actions={
          <button className="btn btn--secondary btn--sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Export Log
          </button>
        }
      />
      <div className="page-body">
        <AuditLogClient />
      </div>
    </>
  )
}
