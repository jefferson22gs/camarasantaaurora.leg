import { useMemo } from 'react'
import { APPROVED_STATUSES, IN_PROGRESS_STATUSES, PropositionStatusMeta, REJECTED_STATUSES, SessionTypeLabel } from '@/domain/labels'
import { useCollection, useLookups } from '@/hooks/useData'
import { formatMonthYear } from '@/lib/format'
import type { Legislature, Proposition, PropositionStatus } from '@/types'

export interface DashboardFilters {
  from: string
  to: string
  legislatureId: string
  councilorId: string
  committeeId: string
  typeId: string
  status: PropositionStatus | ''
}

export const EMPTY_FILTERS: DashboardFilters = { from: '', to: '', legislatureId: '', councilorId: '', committeeId: '', typeId: '', status: '' }

const inRange = (date: string, from: string, to: string) => (!from || date.slice(0, 10) >= from) && (!to || date.slice(0, 10) <= to)

export function filterPropositions(list: Proposition[], f: DashboardFilters, legislatures: Legislature[]) {
  const leg = legislatures.find((l) => l.id === f.legislatureId)
  return list.filter(
    (p) =>
      inRange(p.presentedAt, f.from, f.to) &&
      (!leg || inRange(p.presentedAt, leg.startDate, leg.endDate)) &&
      (!f.councilorId || p.authorId === f.councilorId || p.coauthorIds.includes(f.councilorId)) &&
      (!f.committeeId || p.committeeIds.includes(f.committeeId)) &&
      (!f.typeId || p.typeId === f.typeId) &&
      (!f.status || p.status === f.status),
  )
}

/** Agrega todos os indicadores do dashboard a partir das coleções, respeitando os filtros. */
export function useDashboardData(filters: DashboardFilters) {
  const propositions = useCollection('propositions')
  const sessions = useCollection('sessions')
  const opinions = useCollection('opinions')
  const votings = useCollection('votings')
  const attendance = useCollection('attendance')
  const movements = useCollection('movements')
  const auditLogs = useCollection('auditLogs')
  const legislatures = useCollection('legislatures')
  const lk = useLookups()

  const isLoading = [propositions, sessions, opinions, votings, attendance, movements, legislatures].some((q) => q.isLoading) || !lk.ready
  const isError = [propositions, sessions, opinions, votings, attendance, movements, legislatures].some((q) => q.isError)

  const data = useMemo(() => {
    if (isLoading || isError) return null
    const legs = legislatures.data ?? []
    const props = filterPropositions(propositions.data ?? [], filters, legs)
    const propIds = new Set(props.map((p) => p.id))
    const propFilterActive = !!(filters.councilorId || filters.committeeId || filters.typeId || filters.status)

    const sess = (sessions.data ?? []).filter((s) => inRange(s.date, filters.from, filters.to) && (!filters.legislatureId || s.legislatureId === filters.legislatureId))
    const sessIds = new Set(sess.map((s) => s.id))
    const vots = (votings.data ?? []).filter((v) => v.status === 'closed' && sessIds.has(v.sessionId) && (!propFilterActive || propIds.has(v.propositionId)))
    const ops = (opinions.data ?? []).filter((o) => propIds.has(o.propositionId) && (!filters.committeeId || o.committeeId === filters.committeeId))

    const stats = {
      total: props.length,
      inProgress: props.filter((p) => IN_PROGRESS_STATUSES.includes(p.status)).length,
      approved: props.filter((p) => APPROVED_STATUSES.includes(p.status)).length,
      rejected: props.filter((p) => REJECTED_STATUSES.includes(p.status)).length,
      archived: props.filter((p) => p.status === 'archived' || p.status === 'withdrawn').length,
      sessionsDone: sess.filter((s) => s.status === 'closed').length,
      sessionsFuture: sess.filter((s) => s.status === 'scheduled').length,
      pendingOpinions: ops.filter((o) => o.status !== 'completed').length,
    }

    const byMonthMap = new Map<string, number>()
    for (const p of props) byMonthMap.set(p.presentedAt.slice(0, 7), (byMonthMap.get(p.presentedAt.slice(0, 7)) ?? 0) + 1)
    const byMonth = [...byMonthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month: formatMonthYear(`${month}-01`), total }))

    const byTypeMap = new Map<string, number>()
    for (const p of props) byTypeMap.set(p.typeId, (byTypeMap.get(p.typeId) ?? 0) + 1)
    const byType = [...byTypeMap.entries()].map(([id, total]) => ({ name: lk.types.get(id)?.name ?? id, code: lk.types.get(id)?.code ?? id, total })).sort((a, b) => b.total - a.total)

    const byStatusMap = new Map<PropositionStatus, number>()
    for (const p of props) byStatusMap.set(p.status, (byStatusMap.get(p.status) ?? 0) + 1)
    const byStatus = [...byStatusMap.entries()].map(([s, total]) => ({ name: PropositionStatusMeta[s].label, total })).sort((a, b) => b.total - a.total)

    const productionMap = new Map<string, number>()
    for (const p of props) for (const id of [p.authorId, ...p.coauthorIds]) if (id) productionMap.set(id, (productionMap.get(id) ?? 0) + 1)
    const production = [...productionMap.entries()]
      .map(([id, total]) => ({ name: lk.councilorName(id), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12)

    const att = attendance.data ?? []
    const presence = sess
      .filter((s) => s.status === 'closed' || s.status === 'open' || s.status === 'in_progress')
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => {
        const rows = att.filter((a) => a.sessionId === s.id && a.status !== 'pending')
        const present = rows.filter((a) => a.status === 'present').length
        return { name: `${SessionTypeLabel[s.type].slice(0, 3)}. ${s.number}`, presenca: rows.length ? Math.round((present / rows.length) * 100) : 0, presentes: present }
      })
    const averagePresence = presence.length ? Math.round(presence.reduce((s, p) => s + p.presenca, 0) / presence.length) : 0

    const resultsMap = new Map<string, { name: string; date: string; aprovadas: number; rejeitadas: number; outras: number }>()
    for (const v of vots) {
      const s = sess.find((x) => x.id === v.sessionId)
      if (!s) continue
      const row = resultsMap.get(s.id) ?? { name: `${SessionTypeLabel[s.type].slice(0, 3)}. ${s.number}`, date: s.date, aprovadas: 0, rejeitadas: 0, outras: 0 }
      if (v.result?.outcome === 'approved') row.aprovadas++
      else if (v.result?.outcome === 'rejected') row.rejeitadas++
      else row.outras++
      resultsMap.set(s.id, row)
    }
    const results = [...resultsMap.values()].sort((a, b) => a.date.localeCompare(b.date))

    const activity = [
      ...(movements.data ?? [])
        .filter((m) => propIds.has(m.propositionId))
        .map((m) => {
          const p = props.find((x) => x.id === m.propositionId)
          return { id: m.id, at: m.at, title: m.action, subtitle: `${p ? lk.code(p) : ''} · ${m.from} → ${m.to}`, who: m.responsible, kind: 'movement' as const, link: `/admin/proposicoes/${m.propositionId}` }
        }),
      ...(auditLogs.data ?? []).filter((a) => a.module !== 'auth').map((a) => ({ id: a.id, at: a.at, title: a.operation, subtitle: `${a.recordLabel} · ${a.details}`, who: a.userName, kind: 'audit' as const, link: undefined as string | undefined })),
    ]
      .filter((a) => inRange(a.at, filters.from, filters.to))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 10)

    return { stats, byMonth, byType, byStatus, production, presence, averagePresence, results, activity }
  }, [isLoading, isError, filters, propositions.data, sessions.data, opinions.data, votings.data, attendance.data, movements.data, auditLogs.data, legislatures.data, lk])

  const refetch = () => {
    for (const q of [propositions, sessions, opinions, votings, attendance, movements, legislatures]) q.refetch()
  }

  return { data, isLoading, isError, refetch, legislatures: legislatures.data ?? [], lk }
}
