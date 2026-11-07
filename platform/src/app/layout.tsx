import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

export const viewport: Viewport = {
  themeColor: '#000000',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Prominentz — The Operating System for Modern Restaurants',
    template: '%s | Prominentz',
  },
  description:
    'Restaurant POS, kitchen display (KDS), QR table ordering, and online ordering for $50/month flat. Runs on the iPads and tablets you already own. 0% take-rate.',
  keywords: [
    'restaurant POS',
    'POS system for restaurants',
    'kitchen display system',
    'KDS',
    'QR code ordering',
    'online ordering for restaurants',
    'Toast alternative',
    'Square for restaurants alternative',
    'iPad POS',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Prominentz',
    title: 'Prominentz — Restaurant POS & KDS for $50/month flat',
    description:
      'POS, kitchen display, QR ordering, and online ordering on devices you already own. No contracts, no hardware lock-in, 0% take-rate.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prominentz — Restaurant POS & KDS for $50/month flat',
    description: 'POS, KDS, QR and online ordering on devices you already own. No contracts. 0% take-rate.',
  },
  icons: {
    icon: [
      { url: '/prominentz-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/prominentz-icon.svg',
    apple: '/prominentz-icon.svg',
  },
  manifest: '/manifest.json',
}

import { CookieConsent } from '@/components/ui/CookieConsent'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter:wght@400;500;600;700&display=swap"
        />
        {/* Inline theme init — runs before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('resto-theme')||localStorage.getItem('prominentz-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <CookieConsent />
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.tagged-events.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
