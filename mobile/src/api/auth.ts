import AsyncStorage from '@react-native-async-storage/async-storage'
import { UserProfile } from '../types/models'

const TOKEN_KEY = '@resto_mobile_auth_token'
const USER_KEY = '@resto_mobile_user_profile'

export const AuthService = {
  async saveSession(token: string, user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [USER_KEY, JSON.stringify(user)],
      ])
    } catch (e) {
      console.error('Failed to save session', e)
    }
  },

  async getSession(): Promise<{ token: string | null; user: UserProfile | null }> {
    try {
      const [[, token], [, userData]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY])
      const user = userData ? (JSON.parse(userData) as UserProfile) : null
      return { token, user }
    } catch {
      return { token: null, user: null }
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY])
    } catch (e) {
      console.error('Failed to clear session', e)
    }
  },
}
