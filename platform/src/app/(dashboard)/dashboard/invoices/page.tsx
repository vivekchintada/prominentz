import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'

const InvoicesTableView = dynamic(() => import('@/components/dashboard/InvoicesTableView'), {
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <span style={{ marginLeft: 12, fontSize: 14 }}>Loading Invoices...</span>
    </div>
  ),
})

export const metadata = { title: 'Invoices | Resto AI' }

export default async function InvoicesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <InvoicesTableView />
    </div>
  )
}
