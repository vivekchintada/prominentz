import { Funnel_Display, Inter, Roboto_Mono } from 'next/font/google'

// Marketing faces, scoped to the public pages through CSS variables.
export const displayFont = Funnel_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--lp-display',
  display: 'swap',
})

export const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--lp-body',
  display: 'swap',
})

export const monoFont = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--lp-mono',
  display: 'swap',
})

export const landingFontVars = `${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`
