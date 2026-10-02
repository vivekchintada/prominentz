import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#5b45f5',
}

export const metadata: Metadata = {
  title: {
    default: 'Prominentz — Restaurant Operating Platform',
    template: '%s | Prominentz',
  },
  description: 'Unified FOH + BOH Operating Platform for modern restaurants, cafes, and bars.',
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
        {/* Inline theme init — runs before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('prominentz-theme')||localStorage.getItem('resto-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
