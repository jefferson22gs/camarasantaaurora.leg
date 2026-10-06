import type { CollectionName } from '@/repositories'

export type RealtimeEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'AGENDA_ITEM_CHANGED'
  | 'DISCUSSION_STARTED'
  | 'DISCUSSION_ENDED'
  | 'VOTING_STARTED'
  | 'VOTE_REGISTERED'
  | 'VOTING_ENDED'
  | 'VOTING_CANCELLED'
  | 'RESULT_PUBLISHED'
  /** Alteração genérica de dados (CRUD) — permite sincronizar abas/dispositivos. */
  | 'DATA_CHANGED'

export interface RealtimeEvent {
  type: RealtimeEventType
  sessionId?: string
  votingId?: string
  /** Coleções afetadas: os consumidores invalidam caches correspondentes. */
  collections: Array<CollectionName | 'organization' | 'settings' | 'permissions'>
  at: string
  /** Identifica a aba de origem para evitar eco. */
  origin: string
}

export type RealtimeListener = (event: RealtimeEvent) => void

/**
 * Abstração de tempo real.
 * Fase 1: LocalRealtimeProvider (mesma aba + BroadcastChannel entre abas).
 * Fase 2: SupabaseRealtimeProvider (canais por sessão + postgres_changes).
 */
export interface RealtimeProvider {
  publish(event: Omit<RealtimeEvent, 'at' | 'origin'>): void
  subscribe(listener: RealtimeListener): () => void
}
