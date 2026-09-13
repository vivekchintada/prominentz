import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname.startsWith('/login')
      const userRole = auth?.user?.role

      // Public diner / marketing routes
      const isPublicRoute =
        nextUrl.pathname === '/' ||
        nextUrl.pathname.startsWith('/table') ||
        nextUrl.pathname.startsWith('/menu') ||
        nextUrl.pathname.startsWith('/signup') ||
        nextUrl.pathname.startsWith('/pricing') ||
        nextUrl.pathname.startsWith('/terms') ||
        nextUrl.pathname.startsWith('/privacy')

      if (isPublicRoute) {
        return true
      }

      if (isAuthPage) {
        if (isLoggedIn) {
          if (userRole === 'KITCHEN') return Response.redirect(new URL('/kds', nextUrl))
          if (userRole === 'SERVER')  return Response.redirect(new URL('/pos', nextUrl))
          return Response.redirect(new URL('/dashboard', nextUrl))
        }
        return true
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl))
      }

      // KITCHEN role: strictly restricted to /kds
      if (userRole === 'KITCHEN' && !nextUrl.pathname.startsWith('/kds')) {
        return Response.redirect(new URL('/kds', nextUrl))
      }

      // SERVER role: allowed on /pos, /kds, /dashboard/reservations, /dashboard/waitlist
      if (userRole === 'SERVER') {
        const allowedServerRoutes = ['/pos', '/kds', '/dashboard/reservations', '/dashboard/waitlist']
        const isAllowed = allowedServerRoutes.some((route) => nextUrl.pathname.startsWith(route))
        if (!isAllowed) {
          return Response.redirect(new URL('/pos', nextUrl))
        }
      }

      return true
    },
  },
  providers: [], // Add providers in auth.ts
} satisfies NextAuthConfig
