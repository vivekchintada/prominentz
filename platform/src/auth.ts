import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsedCredentials.success) return null

        const { email, password } = parsedCredentials.data
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.isActive) return null

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
        if (passwordsMatch) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            restaurantId: user.restaurantId,
          }
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
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.restaurantId = token.restaurantId as string
      }
      return session
    },
  },
})
