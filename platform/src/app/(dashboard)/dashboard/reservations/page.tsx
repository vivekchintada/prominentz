import dynamic from 'next/dynamic'
import { ReservationsBoardView } from '@/components/bento/pages/ReservationsBoardView'
import LiveRefresh from '@/components/bento/LiveRefresh'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_RESERVATIONS_BOARD, getReservationsBoard } from '@/lib/bento/reservations-page'

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
  const ctx = await getBentoPageContext()
  const board = await safeLoad(
    'reservations board',
    () => getReservationsBoard(ctx.locationId, ctx.todayStart, ctx.timezone),
    EMPTY_RESERVATIONS_BOARD,
  )

  return (
    <>
      <LiveRefresh events={['reservation.confirmed', 'reservation.updated', 'reservation.no_show', 'waitlist.updated', 'waitlist.converted', 'table.status.changed']} />
      <ReservationsBoardView data={board} timezone={ctx.timezone} />
      <ToolSection title="Bookings" sub="Add, confirm, seat and cancel reservations">
        <ReservationsClient />
      </ToolSection>
    </>
  )
}
