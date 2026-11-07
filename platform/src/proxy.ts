import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  // Protect dashboard, pos, kds, and admin routes. Exclude API, static assets, login, table QR, master menu,
  // order, signup, pricing, root page, SEO files (robots/sitemap/share image) and public image files.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|images|login|table|menu|order|signup|pricing|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$|$).*)',
  ],
}
