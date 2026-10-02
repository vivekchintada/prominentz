import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { QrGeneratorClient } from '@/components/dashboard/QrGeneratorClient'
import { PageHeader } from '@/components/ui/PageHeader'

export const metadata = {
  title: 'Table QR Code Generator | Prominentz',
}

export default async function TableQrPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <PageHeader
        title="QR Code Ordering Studio"
        showRefresh
        subtitle="Generate printable table tent QR codes for contactless ordering and instant digital checkout"
        actions={
          <button className="btn btn--secondary btn--sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print All QRs
          </button>
        }
      />
      <div className="page-body">
        <QrGeneratorClient />
      </div>
    </>
  )
}
