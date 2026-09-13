import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  // Protect dashboard, pos, kds, and admin routes. Exclude API, static assets, login, table QR, master menu, signup, pricing, and root page.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|login|table|menu|signup|pricing|$).*)'],
}
