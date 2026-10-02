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

      // Public diner / marketing / portals routes
      const isPublicRoute =
        nextUrl.pathname === '/' ||
        nextUrl.pathname.startsWith('/table') ||
        nextUrl.pathname.startsWith('/menu') ||
        nextUrl.pathname.startsWith('/order') ||
        nextUrl.pathname.startsWith('/signup') ||
        nextUrl.pathname.startsWith('/pricing') ||
        nextUrl.pathname.startsWith('/terms') ||
        nextUrl.pathname.startsWith('/privacy') ||
        nextUrl.pathname.startsWith('/portals') ||
        nextUrl.pathname.startsWith('/owners') ||
        nextUrl.pathname.startsWith('/managers') ||
        nextUrl.pathname.startsWith('/servers') ||
        nextUrl.pathname.startsWith('/kitchen')

      if (isPublicRoute) {
        return true
      }

      if (isAuthPage) {
        if (isLoggedIn) {
          if (userRole === 'KITCHEN') return Response.redirect(new URL('/kds', nextUrl))
          if (userRole === 'SERVER')  return Response.redirect(new URL('/server', nextUrl))
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

      // SERVER role: strictly restricted to /server and /pos
      if (userRole === 'SERVER') {
        const allowedServerRoutes = ['/server', '/pos']
        const isAllowed = allowedServerRoutes.some((route) => nextUrl.pathname.startsWith(route))
        if (!isAllowed) {
          return Response.redirect(new URL('/server', nextUrl))
        }
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.restaurantId = user.restaurantId
        token.locationId = (user as any).locationId
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
        session.user.restaurantId = token.restaurantId as string
        ;(session.user as any).locationId = token.locationId as string
      }
      return session
    },
  },
  providers: [], // Add providers in auth.ts
} satisfies NextAuthConfig
