import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'

const ReservationsClient = dynamic(() => import('@/components/dashboard/ReservationsClient'), {
  loading: () => (
    <div className="flex items-center justify-center p-12 text-secondary">
      <div className="spinner" />
      <span className="ml-3 text-sm">Loading Reservations...</span>
    </div>
  ),
})

export const metadata = { title: 'Reservations | Prominentz' }

export default async function ReservationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return <ReservationsClient />
}
