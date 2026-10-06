import { SessionTypeLabel } from '@/domain/labels'
import type { Session, SessionStatus } from '@/types'

/** "Sessão Ordinária nº 15/2026" */
export const sessionTitle = (s: Pick<Session, 'type' | 'number' | 'year'>) => `Sessão ${SessionTypeLabel[s.type]} nº ${String(s.number).padStart(2, '0')}/${s.year}`

/** Sessões que ainda aceitam operação (presença, pauta, votação). */
export const isSessionActive = (status: SessionStatus) => status === 'open' || status === 'in_progress' || status === 'suspended'
export const isSessionFinished = (status: SessionStatus) => status === 'closed' || status === 'cancelled'
