import { create } from 'zustand'
import type { UserMe } from '@/types/api'
import { api } from '@/api'

export type AuthStatus = 'idle' | 'loading' | 'authed' | 'guest'

interface AuthState {
  user: UserMe | null
  accessToken: string | null
  status: AuthStatus
  setSession: (user: UserMe, accessToken: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'idle',
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authed' }),
  clear: () => set({ user: null, accessToken: null, status: 'guest' }),
}))

let bootstrapped = false

/** Call once on app start. Sets guest on failure. */
export async function bootstrapAuth(): Promise<void> {
  if (bootstrapped) return
  bootstrapped = true
  useAuthStore.setState({ status: 'loading' })
  try {
    const session = await api.auth.refresh()
    useAuthStore.getState().setSession(session.user, session.accessToken)
  } catch {
    useAuthStore.getState().clear()
  }
}
