import { create } from 'zustand'
import type { User } from '@/types'
import { storageService } from '@/services/storage'

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
}

/**
 * Estado da sessão autenticada (mock).
 * Fase 2: populado a partir de `supabase.auth.onAuthStateChange` + tabela `profiles`.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: storageService.get<User | null>('auth:user', null),
  setUser: (user) => {
    if (user) storageService.set('auth:user', user)
    else storageService.remove('auth:user')
    set({ user })
  },
}))

export const currentUser = () => useAuthStore.getState().user
