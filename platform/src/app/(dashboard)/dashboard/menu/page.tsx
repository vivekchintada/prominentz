import { Suspense } from 'react'
import MenuManagementClient from '@/components/menu/MenuManagementClient'
import { MenuBoardView } from '@/components/bento/pages/MenuBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_MENU_BOARD, getMenuBoard } from '@/lib/bento/menu-page'

export const metadata = { title: 'Menu Management | Prominentz' }

export default async function DashboardMenuPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad('menu board', () => getMenuBoard(ctx.restaurantId, ctx.locationId, ctx.todayStart), EMPTY_MENU_BOARD)

  return (
    <>
      <MenuBoardView data={board} currency={ctx.currency} />
      <ToolSection title="Menu tools" sub="Items, categories, add-ons and coupons">
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading Menu Management...</div>}>
          <MenuManagementClient />
        </Suspense>
      </ToolSection>
    </>
  )
}
