import type { Metadata, Viewport } from 'next'
import { MobileNav } from '@/components/mobile/MobileNav'
import { MobileHeader } from '@/components/mobile/MobileHeader'

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
  themeColor: '#5b45f5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0A0A0B',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, SF Pro Display, Inter, sans-serif',
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
    }}>
      <MobileHeader />
      {/* Content area with bottom padding for nav */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
