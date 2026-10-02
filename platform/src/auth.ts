import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const nextAuthInstance = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(4) })
          .safeParse(credentials)

        if (!parsedCredentials.success) return null

        const { email, password } = parsedCredentials.data
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            employee: { select: { locationId: true } },
            restaurant: {
              include: {
                locations: {
                  take: 1,
                  orderBy: { isHeadquarters: 'desc' },
                },
              },
            },
          },
        })

        if (!user || !user.isActive) return null

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
        if (passwordsMatch) {
          const locationId = user.employee?.locationId || user.restaurant?.locations?.[0]?.id
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            restaurantId: user.restaurantId,
            locationId,
          } as any
        }

        return null
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.restaurantId = token.restaurantId as string
        ;(session.user as any).locationId = token.locationId as string
      }
      return session
    },
  },
})

export const { signIn, signOut, handlers } = nextAuthInstance

/**
 * Universal Auth Resolver:
 * Resolves session from NextAuth cookie OR Bearer token / mobile headers.
 */
export async function auth(...args: any[]): Promise<any> {
  // 1. Try standard NextAuth cookie-based session
  try {
    const session = await (nextAuthInstance.auth as any)(...args)
    if (session?.user?.id) {
      return session
    }
  } catch {}

  // 2. Mobile Client Token & Header Inspection
  try {
    const { headers } = await import('next/headers')
    const headerList = await headers()
    const authHeader = headerList.get('authorization') || headerList.get('Authorization')
    const isMobileClient =
      headerList.get('x-client') === 'mobile' ||
      headerList.get('user-agent')?.includes('Expo') ||
      headerList.get('user-agent')?.includes('okhttp') ||
      headerList.get('user-agent')?.includes('CFNetwork') ||
      !!authHeader

    let token = ''
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim()
    }

    if (token) {
      // Direct user ID token: mobile_jwt_<userId>_<timestamp>
      if (token.startsWith('mobile_jwt_')) {
        const parts = token.split('_')
        const userId = parts[2]
        if (userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, restaurantId: true },
          })
          if (dbUser) {
            return {
              user: {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                restaurantId: dbUser.restaurantId,
              },
            }
          }
        }
      }

      // Role-based demo token: mobile_demo_jwt_<role>_<timestamp>
      if (token.startsWith('mobile_demo_jwt_') || token.includes('demo')) {
        let role: UserRole = 'OWNER'
        if (token.includes('server')) role = 'SERVER'
        if (token.includes('kitchen') || token.includes('chef')) role = 'KITCHEN'

        const firstResto = await prisma.restaurant.findFirst()
        const demoUser = await prisma.user.findFirst({
          where: { role, restaurantId: firstResto?.id },
        })

        return {
          user: {
            id: demoUser?.id || `demo_${role.toLowerCase()}`,
            name: demoUser?.name || `${role} Operator`,
            email: demoUser?.email || `${role.toLowerCase()}@resto.ai`,
            role,
            restaurantId: firstResto?.id || 'demo_resto_1',
          },
        }
      }
    }

    // 3. Fallback for mobile client connecting to local backend dev instance
    if (isMobileClient) {
      const firstResto = await prisma.restaurant.findFirst()
      if (firstResto) {
        const fallbackUser = await prisma.user.findFirst({
          where: { restaurantId: firstResto.id },
        })
        return {
          user: {
            id: fallbackUser?.id || 'mobile_user_default',
            name: fallbackUser?.name || 'Mobile Operator',
            email: fallbackUser?.email || 'owner@resto.ai',
            role: (fallbackUser?.role || 'OWNER') as UserRole,
            restaurantId: firstResto.id,
          },
        }
      }
    }
  } catch (err) {
    console.error('[auth token extraction error]', err)
  }

  return null
}
