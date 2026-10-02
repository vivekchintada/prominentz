import { UserRole } from './index'
import NextAuth, { type DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: UserRole
    restaurantId: string
    locationId?: string
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      restaurantId: string
      locationId?: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    restaurantId: string
    locationId?: string
  }
}
