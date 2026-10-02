import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const InventoryClient = dynamic(() => import('@/components/dashboard/InventoryClient'), {
  loading: () => (
    <div className="flex items-center justify-center p-12 text-secondary">
      <div className="spinner" />
      <span className="ml-3 text-sm">Loading Purchase Orders...</span>
    </div>
  ),
})

export const metadata = { title: 'Purchase Orders & Receiving | Prominentz' }

export default async function InventoryPurchaseOrdersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  return (
    <div style={{ padding: '24px 32px' }}>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Purchase Orders...</div>}>
        <InventoryClient initialTab="pos" />
      </Suspense>
    </div>
  )
}
