import { SettingsClient } from '@/components/dashboard/SettingsClient'
import { SettingsBoardView } from '@/components/bento/pages/SettingsBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_SETTINGS_BOARD, getSettingsBoard } from '@/lib/bento/settings-page'

export const metadata = {
  title: 'Settings | Prominentz',
}

export default async function SettingsPage() {
  const ctx = await getBentoPageContext()
  const board = await safeLoad(
    'settings board',
    () => getSettingsBoard(ctx.restaurantId, ctx.locationId, ctx.currency, ctx.timezone),
    EMPTY_SETTINGS_BOARD,
  )

  return (
    <>
      <SettingsBoardView data={board} outletName={ctx.locationName} />
      <ToolSection title="All settings" sub="Store details, taxes, printers, payment types and delivery">
        <SettingsClient />
      </ToolSection>
    </>
  )
}
