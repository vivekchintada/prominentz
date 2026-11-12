import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import InventoryClient from '@/components/dashboard/InventoryClient'

export const metadata = { title: 'All inventory items' }

/** The full item editor: add, edit, delete, recipes and stock history. */
export default async function InventoryItemsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')
  return <InventoryClient initialTab="stock" />
}
