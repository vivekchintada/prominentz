import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { rateLimit } from '@/lib/rate-limit'
import { parseMobileToken, verifyMobileToken } from '@/lib/auth/mobile-token'

// Compared against when the email is unknown, so a miss takes as long as a wrong password
// and response timing doesn't reveal which emails have accounts.
const TIMING_EQUALIZER_HASH = bcrypt.hashSync('prominentz-timing-equalizer', 10)

function clientIp(request: Request | undefined): string {
  const headers = request?.headers
  return headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || headers?.get('x-real-ip') || 'unknown-ip'
}

const nextAuthInstance = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(1).max(200) })
          .safeParse(credentials)
        if (!parsedCredentials.success) return null

        const email = parsedCredentials.data.email.trim().toLowerCase()
        const { password } = parsedCredentials.data

        // Same limits as the mobile login: per IP and per account.
        const [byIp, byEmail] = await Promise.all([
          rateLimit(`auth:web-login:${clientIp(request)}`, 10, 60),
          rateLimit(`auth:web-login:${email}`, 5, 60),
        ])
        if (!byIp.allowed || !byEmail.allowed) return null

        // Case-insensitive: older staff accounts were stored with the email exactly as typed.
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
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

        const passwordsMatch = await bcrypt.compare(password, user?.passwordHash || TIMING_EQUALIZER_HASH)
        if (!user || !user.isActive || !passwordsMatch) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          restaurantId: user.restaurantId,
          locationId: user.employee?.locationId || user.restaurant?.locations?.[0]?.id,
        } as any
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
 * Resolves the caller from the NextAuth session cookie, or from a mobile Bearer token.
 *
 * Either way the user is re-read from the database, so deactivating someone or changing
 * their role takes effect on their next request instead of when their 30-day JWT expires.
 */
export async function auth(...args: unknown[]): Promise<any> {
  // 1. NextAuth cookie session
  try {
    const session = await (nextAuthInstance.auth as any)(...args)
    if (session?.user?.id) {
      const current = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isActive: true, role: true, restaurantId: true, name: true, email: true },
      })
      if (!current?.isActive) return null
      session.user.role = current.role
      session.user.restaurantId = current.restaurantId
      session.user.name = current.name
      session.user.email = current.email
      return session
    }
  } catch {}

  // 2. Mobile Bearer token
  try {
    const { headers } = await import('next/headers')
    const authHeader = (await headers()).get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const parsed = parseMobileToken(authHeader.slice(7).trim())
    const secret = process.env.NEXTAUTH_SECRET
    if (!parsed || !secret) return null

    const dbUser = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, name: true, email: true, role: true, restaurantId: true, isActive: true, passwordHash: true },
    })
    if (!dbUser?.isActive || !verifyMobileToken(parsed, dbUser, secret)) return null

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        restaurantId: dbUser.restaurantId,
      },
    }
  } catch (err) {
    console.error('[auth token extraction error]', err)
  }

  return null
}
