import { describe, expect, it } from 'vitest'
import type { PresidentRule, QuorumRule, VoteTally, Voting } from '@/types'
import { calculateQuorum, getDeliberationQuorum, getRequiredVotes, hasQuorum } from '@/domain/quorum/quorumEngine'
import { calculateResult, canCouncilorVote, canPresidentVote, formatVoteCode, getEligibleVoters, needsTiebreak, tallyVotes } from './votingEngine'

const rule = (over: Partial<QuorumRule>): QuorumRule => ({
  id: 'q',
  name: 'r',
  type: 'simple_majority',
  base: 'votes_cast',
  threshold: 'majority',
  abstentions: 'exclude',
  description: '',
  ...over,
})
const SIMPLE = rule({})
const ABSOLUTE = rule({ type: 'absolute_majority', base: 'members' })
const TWO_THIRDS = rule({ type: 'two_thirds', base: 'members', threshold: 'fraction', numerator: 2, denominator: 3 })

const president = (over: Partial<PresidentRule> = {}): PresidentRule => ({
  mode: 'never',
  votesOnQuorumTypes: ['two_thirds', 'absolute_majority'],
  votesOnSecret: true,
  tiebreak: true,
  ...over,
})

const tally = (over: Partial<VoteTally>): VoteTally => ({
  yes: 0,
  no: 0,
  abstention: 0,
  notVoted: 0,
  present: 11,
  eligible: 10,
  impeded: 0,
  absent: 1,
  members: 12,
  ...over,
})

const result = (r: QuorumRule, t: VoteTally, extra: Partial<Parameters<typeof calculateResult>[0]> = {}) =>
  calculateResult({ rule: r, tally: t, presidentRule: president(), deliberationQuorum: 'absolute_majority', tieOutcome: 'rejected', now: 'x', ...extra })

describe('QuorumEngine', () => {
  it('maioria simples: mais da metade dos votos válidos', () => {
    expect(getRequiredVotes(SIMPLE, 10)).toBe(6)
    expect(getRequiredVotes(SIMPLE, 11)).toBe(6)
  })
  it('maioria absoluta: mais da metade dos membros', () => {
    expect(calculateQuorum(ABSOLUTE, tally({})).requiredVotes).toBe(7)
  })
  it('2/3 sem erro de ponto flutuante', () => {
    expect(getRequiredVotes(TWO_THIRDS, 12)).toBe(8)
    expect(getRequiredVotes(TWO_THIRDS, 13)).toBe(9)
    expect(getRequiredVotes(TWO_THIRDS, 9)).toBe(6)
  })
  it('quórum fixo/específico', () => {
    expect(getRequiredVotes(rule({ threshold: 'fixed', fixedVotes: 5 }), 99)).toBe(5)
  })
  it('abstenções incluídas na base quando configurado', () => {
    const t = tally({ yes: 5, no: 3, abstention: 3 })
    expect(calculateQuorum(SIMPLE, t).baseValue).toBe(8)
    expect(calculateQuorum(rule({ abstentions: 'include' }), t).baseValue).toBe(11)
  })
  it('base "membros aptos" desconta impedidos', () => {
    expect(calculateQuorum(rule({ base: 'eligible' }), tally({ impeded: 2 })).baseValue).toBe(10)
  })
  it('quórum de deliberação', () => {
    expect(getDeliberationQuorum(12, 'absolute_majority')).toBe(7)
    expect(getDeliberationQuorum(12, 'one_third')).toBe(4)
    expect(hasQuorum(6, 12, 'absolute_majority')).toBe(false)
    expect(hasQuorum(7, 12, 'absolute_majority')).toBe(true)
  })
})

describe('VotingEngine — apuração', () => {
  it('aprova por maioria simples', () => {
    expect(result(SIMPLE, tally({ yes: 8, no: 2, abstention: 1 })).outcome).toBe('approved')
  })
  it('abstenções não contam como SIM: rejeita quando abstenções entram na base', () => {
    const t = tally({ yes: 5, no: 2, abstention: 4 })
    expect(result(SIMPLE, t).outcome).toBe('approved')
    expect(result(rule({ abstentions: 'include' }), t).outcome).toBe('rejected')
  })
  it('maioria absoluta exige 7 de 12 independentemente dos presentes', () => {
    expect(result(ABSOLUTE, tally({ yes: 6, no: 1 })).outcome).toBe('rejected')
    expect(result(ABSOLUTE, tally({ yes: 7, no: 3 })).outcome).toBe('approved')
  })
  it('2/3 exige 8 de 12', () => {
    expect(result(TWO_THIRDS, tally({ yes: 7, no: 3 })).outcome).toBe('rejected')
    expect(result(TWO_THIRDS, tally({ yes: 8, no: 2 })).outcome).toBe('approved')
  })
  it('sem quórum de presença', () => {
    expect(result(SIMPLE, tally({ yes: 5, present: 5 })).outcome).toBe('no_quorum')
  })
  it('empate sem desempate: aplica configuração', () => {
    const t = tally({ yes: 5, no: 5 })
    expect(result(SIMPLE, t, { presidentRule: president({ tiebreak: false }) }).outcome).toBe('rejected')
    expect(result(SIMPLE, t, { presidentRule: president({ tiebreak: false }), tieOutcome: 'tie' }).outcome).toBe('tie')
  })
  it('empate com voto de desempate do Presidente', () => {
    const t = tally({ yes: 5, no: 5 })
    expect(needsTiebreak({ rule: SIMPLE, tally: t, presidentRule: president(), deliberationQuorum: 'absolute_majority', tieOutcome: 'rejected' })).toBe(true)
    const r = result(SIMPLE, t, { tiebreakVote: 'yes' })
    expect(r.outcome).toBe('approved')
    expect(r.tieBrokenByPresident).toBe(true)
    expect(r.yes).toBe(6)
    expect(result(SIMPLE, t, { tiebreakVote: 'no' }).outcome).toBe('rejected')
  })
})

describe('VotingEngine — elegibilidade', () => {
  const ids = Array.from({ length: 12 }, (_, i) => `c${i + 1}`)
  const ctx = { memberIds: ids, presentIds: ids.slice(0, 11), impededIds: ['c3'], presidentId: 'c1', quorumType: 'simple_majority' as const, method: 'nominal' as const }

  it('regra do Presidente', () => {
    expect(canPresidentVote(president({ mode: 'normal' }), 'simple_majority', 'nominal')).toBe(true)
    expect(canPresidentVote(president({ mode: 'never' }), 'two_thirds', 'nominal')).toBe(false)
    expect(canPresidentVote(president({ mode: 'specific' }), 'two_thirds', 'nominal')).toBe(true)
    expect(canPresidentVote(president({ mode: 'specific' }), 'simple_majority', 'nominal')).toBe(false)
    expect(canPresidentVote(president({ mode: 'specific' }), 'simple_majority', 'secret')).toBe(true)
  })
  it('remove impedidos, ausentes e Presidente (quando não vota)', () => {
    const eligible = getEligibleVoters({ ...ctx, presidentRule: president() })
    expect(eligible).toHaveLength(9)
    expect(eligible).not.toContain('c1')
    expect(eligible).not.toContain('c3')
    expect(eligible).not.toContain('c12')
    expect(getEligibleVoters({ ...ctx, presidentRule: president({ mode: 'normal' }) })).toHaveLength(10)
  })

  const voting: Voting = {
    id: 'v',
    sessionId: 's',
    agendaItemId: 'a',
    propositionId: 'p',
    method: 'nominal',
    quorumRule: SIMPLE,
    status: 'open',
    round: 1,
    durationSeconds: 120,
    automaticClose: false,
    memberIds: ids,
    presentIds: ids.slice(0, 11),
    impededIds: ['c3'],
    eligibleIds: getEligibleVoters({ ...ctx, presidentRule: president() }),
    presidentId: 'c1',
    participantIds: ['c2'],
  }
  it('impede voto duplicado, impedido, ausente e Presidente', () => {
    expect(canCouncilorVote(voting, 'c4')).toEqual({ allowed: true })
    expect(canCouncilorVote(voting, 'c2')).toEqual({ allowed: false, reason: 'already_voted' })
    expect(canCouncilorVote(voting, 'c3')).toEqual({ allowed: false, reason: 'impeded' })
    expect(canCouncilorVote(voting, 'c12')).toEqual({ allowed: false, reason: 'absent' })
    expect(canCouncilorVote(voting, 'c1')).toEqual({ allowed: false, reason: 'president_rule' })
    expect(canCouncilorVote({ ...voting, status: 'closed' }, 'c4')).toEqual({ allowed: false, reason: 'not_open' })
  })
  it('contagem e não votantes', () => {
    const t = tallyVotes(voting, [{ choice: 'yes' }, { choice: 'yes' }, { choice: 'no' }, { choice: 'abstention' }])
    expect(t).toMatchObject({ yes: 2, no: 1, abstention: 1, notVoted: 5, eligible: 9, impeded: 1, present: 11, absent: 1, members: 12 })
  })
  it('votação simbólica usa placar declarado', () => {
    const t = tallyVotes({ ...voting, method: 'symbolic', symbolicTally: { yes: 7, no: 2, abstention: 0 } }, [])
    expect(t.yes).toBe(7)
  })
  it('identificador do voto', () => {
    expect(formatVoteCode(2026, 125)).toBe('VOT-2026-000125')
  })
})
