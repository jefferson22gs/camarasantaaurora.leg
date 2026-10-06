import type { AuditLog, Notification, NotificationCategory, RoleKey } from '@/types'
import { dataSource } from '@/repositories'
import { realtime, type RealtimeEvent } from '@/realtime'
import { currentUser } from '@/stores/authStore'
import { uid } from '@/lib/utils'

/** Descrição do dispositivo atual (simulação — o backend registrará o dado real). */
function deviceLabel() {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPad|iPhone/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'SO'
  const tablet = /iPad|Tablet|Android(?!.*Mobile)/.test(ua) || (navigator.maxTouchPoints > 1 && window.innerWidth >= 700 && window.innerWidth <= 1366)
  return `${browser} · ${os}${tablet ? ' · Tablet' : ''}`
}

export type AuditInput = Pick<AuditLog, 'operation' | 'module' | 'recordLabel' | 'details'> & Partial<Pick<AuditLog, 'recordId' | 'before' | 'after' | 'origin' | 'notes'>>

/**
 * Registro de auditoria.
 * ATENÇÃO: no frontend o log é apenas demonstrativo. Em produção a auditoria deve ser
 * gravada pelo backend (trigger/Edge Function), em tabela append-only, com IP real.
 */
export async function audit(input: AuditInput) {
  const user = currentUser()
  const entry: AuditLog = {
    id: uid('au'),
    at: new Date().toISOString(),
    userId: user?.id ?? 'anonymous',
    userName: user?.name ?? 'Visitante',
    role: user?.role ?? 'system',
    origin: input.origin ?? 'web',
    device: deviceLabel(),
    ip: '10.20.5.' + (10 + ((user?.id.length ?? 0) * 7) % 200),
    ...input,
  }
  await dataSource.collection('auditLogs').create(entry)
  return entry
}

export async function notify(input: { title: string; message: string; category: NotificationCategory; link?: string; targetRoles?: RoleKey[] }) {
  const n: Notification = { id: uid('nt'), createdAt: new Date().toISOString(), targetRoles: [], readBy: [], ...input }
  await dataSource.collection('notifications').create(n)
  return n
}

/** Publica a mudança para todas as telas/abas (invalidação de cache + eventos de sessão). */
export function broadcast(event: Omit<RealtimeEvent, 'at' | 'origin'>) {
  realtime.publish(event)
}

export const notificationService = {
  async markRead(ids: string[], userId: string) {
    const repo = dataSource.collection('notifications')
    const all = await repo.list()
    await repo.upsertMany(all.filter((n) => ids.includes(n.id) && !n.readBy.includes(userId)).map((n) => ({ ...n, readBy: [...n.readBy, userId] })))
    broadcast({ type: 'DATA_CHANGED', collections: ['notifications'] })
  },
  async remove(id: string) {
    await dataSource.collection('notifications').remove(id)
    broadcast({ type: 'DATA_CHANGED', collections: ['notifications'] })
  },
}
