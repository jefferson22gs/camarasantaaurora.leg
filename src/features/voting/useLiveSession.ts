import { useMemo } from 'react'
import { useCollection, useOrganization, useSettings } from '@/hooks/useData'
import { getDeliberationQuorum } from '@/domain/quorum/quorumEngine'
import { tallyVotes } from '@/domain/voting/votingEngine'
import type { Session } from '@/types'

const LIVE: Session['status'][] = ['open', 'in_progress', 'suspended']

/** Escolhe a sessão "ao vivo": aberta/em andamento; senão a de hoje; senão a próxima agendada. */
export function pickLiveSession(sessions: Session[], today = new Date().toISOString().slice(0, 10)) {
  return (
    sessions.find((s) => LIVE.includes(s.status)) ??
    sessions.find((s) => s.date === today && s.status !== 'cancelled') ??
    [...sessions].filter((s) => s.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date))[0] ??
    null
  )
}

/**
 * Estado consolidado da sessão plenária em curso — compartilhado por Presidência, Vereador e Painel.
 * Fase 2: o mesmo hook passará a ser alimentado pelo SupabaseRealtimeProvider sem mudanças nas telas.
 */
export function useLiveSession(sessionId?: string) {
  const sessions = useCollection('sessions')
  const agendas = useCollection('agendas')
  const votings = useCollection('votings')
  const votes = useCollection('votes')
  const attendance = useCollection('attendance')
  const propositions = useCollection('propositions')
  const councilors = useCollection('councilors')
  const impediments = useCollection('impediments')
  const org = useOrganization()
  const settings = useSettings()

  const isLoading = [sessions, agendas, votings, votes, attendance, propositions, councilors, impediments, org, settings].some((q) => q.isLoading)
  const isError = [sessions, agendas, votings, votes, attendance, propositions].some((q) => q.isError)

  return useMemo(() => {
    const session = sessionId ? (sessions.data?.find((s) => s.id === sessionId) ?? null) : pickLiveSession(sessions.data ?? [])
    const agenda = session ? (agendas.data?.find((a) => a.sessionId === session.id) ?? null) : null
    const items = [...(agenda?.items ?? [])].sort((a, b) => a.order - b.order)
    const currentItem = items.find((i) => i.id === session?.currentAgendaItemId) ?? null
    const sessionVotings = (votings.data ?? []).filter((v) => v.sessionId === session?.id)
    const openVoting = sessionVotings.find((v) => v.status === 'open') ?? null
    const itemVotings = sessionVotings.filter((v) => v.agendaItemId === currentItem?.id).sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''))
    const voting = openVoting ?? itemVotings[0] ?? null
    const lastClosed = [...sessionVotings].filter((v) => v.status === 'closed').sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''))[0] ?? null
    const votingVotes = (votes.data ?? []).filter((v) => v.votingId === voting?.id)
    const tally = voting ? tallyVotes(voting, votingVotes) : null
    const proposition = propositions.data?.find((p) => p.id === (voting?.propositionId ?? currentItem?.propositionId)) ?? null
    const members = (councilors.data ?? []).filter((c) => c.status === 'active' && c.legislatureId === org.data?.currentLegislatureId)
    const sessionAttendance = (attendance.data ?? []).filter((a) => a.sessionId === session?.id)
    const presentIds = sessionAttendance.filter((a) => a.status === 'present').map((a) => a.councilorId)
    const seats = Math.max(members.length, org.data?.councilSeats ?? 0)
    const requiredPresence = settings.data ? getDeliberationQuorum(seats, settings.data.voting.deliberationQuorum) : 0
    const itemImpediments = (impediments.data ?? []).filter((i) => i.propositionId === currentItem?.propositionId)

    return {
      isLoading,
      isError,
      session,
      agenda,
      items,
      currentItem,
      voting,
      openVoting,
      lastClosed,
      votes: votingVotes,
      tally,
      proposition,
      members,
      attendance: sessionAttendance,
      presentIds,
      requiredPresence,
      hasQuorum: presentIds.length >= requiredPresence,
      impediments: itemImpediments,
      settings: settings.data ?? null,
      organization: org.data ?? null,
      allVotings: votings.data ?? [],
      allVotes: votes.data ?? [],
      propositions: propositions.data ?? [],
    }
  }, [sessionId, sessions.data, agendas.data, votings.data, votes.data, attendance.data, propositions.data, councilors.data, impediments.data, org.data, settings.data, isLoading, isError])
}

export type LiveSession = ReturnType<typeof useLiveSession>
