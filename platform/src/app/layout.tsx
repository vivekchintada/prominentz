import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#000000',
}

export const metadata: Metadata = {
  title: {
    default: 'Resto — The Operating System for Modern Restaurants',
    template: '%s | Resto',
  },
  description: 'The operating system for modern restaurants. Front-of-house, kitchen bump bars, and manager controls in one unified platform.',
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
