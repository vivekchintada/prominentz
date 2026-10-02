import { create } from 'zustand'
import { UserProfile, UserRole } from '../types/models'
import { AuthService } from '../api/auth'
import { Api } from '../api/client'

export type TabKey =
  | 'OVERVIEW'
  | 'TABLES'
  | 'ORDERS'
  | 'ONLINE_ORDERS'
  | 'KDS'
  | 'WAITLIST'
  | 'BOOKINGS'
  | 'MENU_86'
  | 'STOCK'
  | 'STAFF'


interface AppState {
  // Auth
  user: UserProfile | null
  isRestoringSession: boolean

  // Navigation
  activeTab: TabKey
  hubVisible: boolean

  // Actions
  restoreSession: () => Promise<void>
  login: (user: UserProfile) => void
  logout: () => Promise<void>
  setActiveTab: (tab: TabKey) => void
  setHubVisible: (visible: boolean) => void
  switchRole: (role: UserRole | string) => void
}

const defaultTabForRole = (role: string): TabKey => {
  if (role === 'SERVER') return 'TABLES'
  if (role === 'KITCHEN') return 'KDS'
  return 'OVERVIEW'
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isRestoringSession: true,
  activeTab: 'OVERVIEW',
  hubVisible: false,

  restoreSession: async () => {
    const { user } = await AuthService.getSession()
    if (user) {
      set({ user, activeTab: defaultTabForRole(user.role), isRestoringSession: false })
    } else {
      set({ isRestoringSession: false })
    }
  },

  login: (user) => {
    set({ user, activeTab: defaultTabForRole(user.role) })
  },

  logout: async () => {
    await AuthService.clearSession()
    set({ user: null, activeTab: 'OVERVIEW' })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setHubVisible: (visible) => set({ hubVisible: visible }),

  switchRole: (role) => set({ activeTab: defaultTabForRole(role as string) }),
}))
