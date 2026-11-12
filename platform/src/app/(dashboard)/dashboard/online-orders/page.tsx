import type { Metadata } from 'next'
import OnlineOrdersClient from '@/components/dashboard/OnlineOrdersClient'
import { DeliveryBoardView } from '@/components/bento/pages/DeliveryBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_DELIVERY_BOARD, getDeliveryBoard } from '@/lib/bento/delivery-page'

export const metadata: Metadata = {
  title: 'Online Orders Dispatch | Prominentz',
  description: 'Live order command center, kitchen dispatch, and customer fulfilment tracking',
}

export default async function OnlineOrdersPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad('delivery board', () => getDeliveryBoard(ctx.restaurantId, ctx.locationId, ctx.todayStart), EMPTY_DELIVERY_BOARD)

  return (
    <>
      <DeliveryBoardView data={board} currency={ctx.currency} />
      <ToolSection title="Dispatch board" sub="Accept, prepare and hand over pickup and delivery orders">
        <OnlineOrdersClient />
      </ToolSection>
    </>
  )
}
