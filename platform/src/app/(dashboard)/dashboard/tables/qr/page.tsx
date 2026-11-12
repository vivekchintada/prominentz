import { headers } from 'next/headers'
import { QrGeneratorClient } from '@/components/dashboard/QrGeneratorClient'
import { QrBoardView } from '@/components/bento/pages/QrBoardView'
import { ToolSection } from '@/components/bento/pages/parts'
import { getBentoPageContext, safeLoad } from '@/lib/bento/page-context'
import { EMPTY_QR_BOARD, getQrBoard } from '@/lib/bento/qr-page'

export const metadata = {
  title: 'Table QR Code Generator | Prominentz',
}

/** The site's own address, matching what the QR studio prints (it uses the browser's origin). */
async function siteOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export default async function TableQrPage() {
  const ctx = await getBentoPageContext()
  const origin = await siteOrigin()
  const board = await safeLoad('QR board', () => getQrBoard(ctx.restaurantId, ctx.locationId, ctx.todayStart, origin), EMPTY_QR_BOARD)

  return (
    <>
      <QrBoardView data={board} currency={ctx.currency} />
      <ToolSection title="QR code studio" sub="Design, download and print table codes">
        <QrGeneratorClient />
      </ToolSection>
    </>
  )
}
