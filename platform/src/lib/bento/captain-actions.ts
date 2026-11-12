'use server'

import { signOut } from '@/auth'

export async function captainSignOut() {
  await signOut({ redirectTo: '/login' })
}
