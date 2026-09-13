import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'

const TablesClient = dynamic(() => import('@/components/dashboard/TablesClient'), {
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <span style={{ marginLeft: 12, fontSize: 14 }}>Loading Tables...</span>
    </div>
  ),
})

export const metadata = { title: 'Tables & Floor Plan | Resto AI' }

export default async function TablesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return <TablesClient />
}
