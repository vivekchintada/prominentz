import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import InventoryClient from '@/components/dashboard/InventoryClient'

export const metadata = { title: 'Wastage' }

export default async function InventoryWastePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')
  return <InventoryClient initialTab="waste" />
}
