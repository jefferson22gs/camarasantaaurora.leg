import type {
  DeliberationQuorum,
  ID,
  PresidentRule,
  QuorumRule,
  QuorumType,
  Vote,
  VoteChoice,
  VoteTally,
  Voting,
  VotingMethod,
  VotingOutcome,
  VotingResult,
} from '@/types'
import { calculateQuorum, getDeliberationQuorum } from '@/domain/quorum/quorumEngine'

/**
 * VotingEngine — regras de votação como funções puras e testáveis.
 * Fase 1: executado no navegador para simulação.
 * Fase 2: o backend (Edge Function / RPC) torna-se a fonte da verdade; este módulo
 * continua útil para pré-visualização e validação de UX.
 */

export const OUTCOME_LABEL: Record<VotingOutcome, string> = {
  approved: 'APROVADO',
  rejected: 'REJEITADO',
  tie: 'EMPATE',
  no_quorum: 'SEM QUÓRUM',
}

/** Regra do Presidente: pode votar nesta matéria (fora do desempate)? */
export function canPresidentVote(rule: PresidentRule, quorumType: QuorumType, method: VotingMethod): boolean {
  switch (rule.mode) {
    case 'normal':
      return true
    case 'never':
      return false
    case 'specific':
      return rule.votesOnQuorumTypes.includes(quorumType) || (method === 'secret' && rule.votesOnSecret)
  }
}

export interface VoterContext {
  memberIds: ID[]
  presentIds: ID[]
  impededIds: ID[]
  presidentId: ID
  presidentRule: PresidentRule
  quorumType: QuorumType
  method: VotingMethod
}

/** Vereadores aptos a votar: presentes, sem impedimento e (se Presidente) conforme regra. */
export function getEligibleVoters(ctx: VoterContext): ID[] {
  const presidentVotes = canPresidentVote(ctx.presidentRule, ctx.quorumType, ctx.method)
  return ctx.presentIds.filter(
    (id) => ctx.memberIds.includes(id) && !ctx.impededIds.includes(id) && (id !== ctx.presidentId || presidentVotes),
  )
}

export type VoteDenial = 'not_open' | 'not_member' | 'absent' | 'impeded' | 'president_rule' | 'already_voted' | 'symbolic'

export const VOTE_DENIAL_LABEL: Record<VoteDenial, string> = {
  not_open: 'A votação não está aberta.',
  not_member: 'Vereador não integra a composição desta votação.',
  absent: 'Presença não registrada nesta sessão.',
  impeded: 'Vereador impedido ou declarado suspeito nesta matéria.',
  president_rule: 'Pela regra regimental, o Presidente não vota nesta matéria.',
  already_voted: 'Voto já registrado nesta votação.',
  symbolic: 'Votação simbólica: o resultado é declarado pela Presidência.',
}

export function canCouncilorVote(voting: Voting, councilorId: ID): { allowed: true } | { allowed: false; reason: VoteDenial } {
  if (voting.status !== 'open') return { allowed: false, reason: 'not_open' }
  if (voting.method === 'symbolic') return { allowed: false, reason: 'symbolic' }
  if (!voting.memberIds.includes(councilorId)) return { allowed: false, reason: 'not_member' }
  if (voting.impededIds.includes(councilorId)) return { allowed: false, reason: 'impeded' }
  if (!voting.presentIds.includes(councilorId)) return { allowed: false, reason: 'absent' }
  if (voting.participantIds.includes(councilorId)) return { allowed: false, reason: 'already_voted' }
  if (!voting.eligibleIds.includes(councilorId)) return { allowed: false, reason: 'president_rule' }
  return { allowed: true }
}

/** Contagem de votos. Em votação simbólica utiliza o placar declarado. */
export function tallyVotes(voting: Pick<Voting, 'method' | 'memberIds' | 'presentIds' | 'impededIds' | 'eligibleIds' | 'symbolicTally'>, votes: Pick<Vote, 'choice'>[]): VoteTally {
  const counts = { yes: 0, no: 0, abstention: 0 }
  if (voting.method === 'symbolic' && voting.symbolicTally) Object.assign(counts, voting.symbolicTally)
  else for (const v of votes) counts[v.choice]++
  const cast = counts.yes + counts.no + counts.abstention
  return {
    ...counts,
    members: voting.memberIds.length,
    present: voting.presentIds.length,
    impeded: voting.impededIds.length,
    eligible: voting.eligibleIds.length,
    absent: voting.memberIds.length - voting.presentIds.length,
    notVoted: Math.max(0, voting.eligibleIds.length - cast),
  }
}

export interface ResultInput {
  rule: QuorumRule
  tally: VoteTally
  presidentRule: PresidentRule
  deliberationQuorum: DeliberationQuorum
  tieOutcome: 'rejected' | 'tie'
  /** Voto de desempate do Presidente, quando aplicável. */
  tiebreakVote?: VoteChoice
  now?: string
}

/** Empate que pode ser decidido pelo voto de minerva do Presidente. */
export function isTie(tally: Pick<VoteTally, 'yes' | 'no'>): boolean {
  return tally.yes === tally.no && tally.yes > 0
}

export function needsTiebreak(input: Omit<ResultInput, 'tiebreakVote'>): boolean {
  const preview = calculateResult({ ...input, tiebreakVote: undefined })
  return preview.outcome !== 'no_quorum' && isTie(input.tally) && input.presidentRule.tiebreak && preview.outcome !== 'approved'
}

export function calculateResult(input: ResultInput): VotingResult {
  const { rule, tally, presidentRule, tiebreakVote } = input
  const computedAt = input.now ?? new Date().toISOString()
  const minPresence = getDeliberationQuorum(tally.members, input.deliberationQuorum)

  if (tally.present < minPresence) {
    const q = calculateQuorum(rule, tally)
    return {
      ...tally,
      ...q,
      outcome: 'no_quorum',
      tieBrokenByPresident: false,
      computedAt,
      explanation: `Presença (${tally.present}) inferior ao quórum de deliberação (${minPresence}).`,
    }
  }

  const base = calculateQuorum(rule, tally)
  if (tally.yes >= base.requiredVotes) {
    return { ...tally, ...base, outcome: 'approved', tieBrokenByPresident: false, computedAt, explanation: `${tally.yes} votos favoráveis; necessários ${base.requiredVotes}.` }
  }

  if (isTie(tally)) {
    if (presidentRule.tiebreak && tiebreakVote) {
      const broken: VoteTally = { ...tally, [tiebreakVote]: tally[tiebreakVote] + 1 }
      const q = calculateQuorum(rule, broken)
      const approved = broken.yes >= q.requiredVotes
      return {
        ...broken,
        ...q,
        outcome: approved ? 'approved' : 'rejected',
        tieBrokenByPresident: true,
        computedAt,
        explanation: `Empate em ${tally.yes} x ${tally.no}, desempatado pelo voto do Presidente.`,
      }
    }
    return {
      ...tally,
      ...base,
      outcome: input.tieOutcome,
      tieBrokenByPresident: false,
      computedAt,
      explanation: `Empate em ${tally.yes} x ${tally.no}${presidentRule.tiebreak ? ' aguardando voto de desempate' : ''}.`,
    }
  }

  return { ...tally, ...base, outcome: 'rejected', tieBrokenByPresident: false, computedAt, explanation: `${tally.yes} votos favoráveis; necessários ${base.requiredVotes}.` }
}

/** Identificador público do voto: VOT-2026-000125 */
export function formatVoteCode(year: number, sequence: number) {
  return `VOT-${year}-${String(sequence).padStart(6, '0')}`
}

/** Segundos restantes do cronômetro. */
export function getRemainingSeconds(voting: Pick<Voting, 'closesAt' | 'status'>, now = Date.now()) {
  if (voting.status !== 'open' || !voting.closesAt) return 0
  return Math.max(0, Math.round((new Date(voting.closesAt).getTime() - now) / 1000))
}
