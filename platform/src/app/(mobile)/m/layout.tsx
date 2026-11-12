import type { Metadata, Viewport } from 'next'
import { MobileNav } from '@/components/mobile/MobileNav'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { RestaurantCurrency } from '@/components/providers/RestaurantCurrency'

export const metadata: Metadata = {
  title: 'Prominentz Manager',
  description: 'Mobile manager dashboard for Prominentz',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Prominentz',
  },
}

export const viewport: Viewport = {
  themeColor: 'var(--brand)',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      color: 'var(--color-text-primary)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-sans)',
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
    }}>
      <RestaurantCurrency>
        <MobileHeader />
        {/* Content area with bottom padding for nav */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
          {children}
        </div>
        <MobileNav />
      </RestaurantCurrency>
    </div>
  )
}
