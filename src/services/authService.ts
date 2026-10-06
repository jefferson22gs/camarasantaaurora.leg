import type { User } from '@/types'
import { dataSource } from '@/repositories'
import { useAuthStore } from '@/stores/authStore'
import { audit } from './activity'

/**
 * Autenticação MOCK.
 * Não há senha nem token: o usuário é escolhido na tela de demonstração.
 * Fase 2: substituir por Supabase Auth (signInWithPassword / OTP) mantendo esta interface.
 */
export interface AuthService {
  listDemoUsers(): Promise<User[]>
  signIn(userId: string): Promise<User>
  signOut(): Promise<void>
}

export const authService: AuthService = {
  async listDemoUsers() {
    return (await dataSource.collection('users').list()).filter((u) => u.active)
  },
  async signIn(userId) {
    const user = await dataSource.collection('users').get(userId)
    if (!user || !user.active) throw new Error('Usuário inexistente ou inativo.')
    const updated = await dataSource.collection('users').update(user.id, { lastAccessAt: new Date().toISOString() })
    useAuthStore.getState().setUser(updated)
    await audit({ operation: 'Login', module: 'auth', recordId: user.id, recordLabel: 'Sessão de usuário', details: 'Autenticação de demonstração bem-sucedida' })
    return updated
  },
  async signOut() {
    if (useAuthStore.getState().user) await audit({ operation: 'Logout', module: 'auth', recordLabel: 'Sessão de usuário', details: 'Encerramento de sessão' })
    useAuthStore.getState().setUser(null)
  },
}
