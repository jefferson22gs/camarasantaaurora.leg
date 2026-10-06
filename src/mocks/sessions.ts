import type { Agenda, AgendaItem, Attendance, AttendanceStatus, Impediment, Session, Vote, VoteChoice, Voting } from '@/types'
import { calculateResult, formatVoteCode, getEligibleVoters, tallyVotes } from '@/domain/voting/votingEngine'
import { quorumRulesSeed, settingsSeed } from './organization'
import { councilorsSeed } from './people'
import { propositionsSeed } from './propositions'

const MEMBERS = councilorsSeed.filter((c) => c.status === 'active').map((c) => c.id)
const PRESIDENT = 'cv_01'
const LOCATION = settingsSeed.sessionDefaults.location

const session = (o: Partial<Session> & Pick<Session, 'id' | 'type' | 'number' | 'date' | 'status'>): Session => ({
  year: 2026,
  startTime: '19:00',
  legislatureId: 'leg_20',
  presidentId: PRESIDENT,
  location: LOCATION,
  expedient: '',
  notes: '',
  ...o,
})

/** Sessão de demonstração: Ordinária nº 15/2026 (hoje). */
export const DEMO_SESSION_ID = 'ss_ord_15'

export const sessionsSeed: Session[] = [
  session({
    id: 'ss_ord_13',
    type: 'ordinary',
    number: 13,
    date: '2026-09-22',
    status: 'closed',
    endTime: '21:48',
    openedAt: '2026-09-22T22:02:00.000Z',
    closedAt: '2026-09-23T00:48:00.000Z',
    expedient: 'Leitura e aprovação da ata da sessão anterior. Leitura de ofícios do Poder Executivo nº 214 e 219/2026. Apresentação de indicações e requerimentos.',
  }),
  session({
    id: 'ss_ext_03',
    type: 'extraordinary',
    number: 3,
    date: '2026-09-24',
    startTime: '18:00',
    status: 'closed',
    endTime: '19:35',
    openedAt: '2026-09-24T21:03:00.000Z',
    closedAt: '2026-09-24T22:35:00.000Z',
    expedient: 'Sessão extraordinária convocada pelo Presidente para deliberação de matérias com prazo regimental.',
  }),
  session({
    id: 'ss_ord_14',
    type: 'ordinary',
    number: 14,
    date: '2026-09-29',
    status: 'closed',
    endTime: '21:20',
    openedAt: '2026-09-29T22:01:00.000Z',
    closedAt: '2026-09-30T00:20:00.000Z',
    expedient: 'Leitura e aprovação da ata da 13ª Sessão Ordinária. Comunicações da Presidência. Leitura do Ofício nº 231/2026 do Poder Executivo.',
  }),
  session({
    id: DEMO_SESSION_ID,
    type: 'ordinary',
    number: 15,
    date: '2026-10-06',
    status: 'open',
    openedAt: '2026-10-06T22:00:00.000Z',
    currentAgendaItemId: 'ai_15_1',
    expedient:
      'Leitura e aprovação da ata da 14ª Sessão Ordinária. Leitura do Ofício nº 238/2026 do Poder Executivo, que encaminha o balancete de agosto. Apresentação da Indicação nº 088/2026 (Ver. Fernanda Costa).',
  }),
  session({ id: 'ss_aud_04', type: 'public_hearing', number: 4, date: '2026-10-15', startTime: '19:30', status: 'scheduled', expedient: 'Audiência pública sobre a qualidade do transporte coletivo municipal (REQ 110/2026).' }),
  session({ id: 'ss_ord_16', type: 'ordinary', number: 16, date: '2026-10-13', status: 'scheduled' }),
  session({ id: 'ss_sol_02', type: 'solemn', number: 2, date: '2026-10-20', startTime: '19:30', status: 'scheduled', expedient: 'Sessão solene de entrega do Título de Cidadão Santa-Aurorense.' }),
  session({ id: 'ss_ord_12', type: 'ordinary', number: 12, date: '2026-09-15', status: 'cancelled', notes: 'Cancelada por ponto facultativo decretado pelo Executivo.' }),
]

/* ---------- Presença ---------- */

const ABSENT: Record<string, Partial<Record<string, AttendanceStatus>>> = {
  ss_ord_13: { cv_09: 'justified' },
  ss_ext_03: { cv_06: 'absent', cv_11: 'justified' },
  ss_ord_14: { cv_12: 'justified' },
  [DEMO_SESSION_ID]: { cv_06: 'justified' },
}

export const attendanceSeed: Attendance[] = sessionsSeed
  .filter((s) => s.status === 'closed' || s.status === 'open')
  .flatMap((s) =>
    MEMBERS.map<Attendance>((councilorId) => {
      const status = ABSENT[s.id]?.[councilorId] ?? 'present'
      return {
        id: `at_${s.id}_${councilorId}`,
        sessionId: s.id,
        councilorId,
        status,
        registeredAt: s.openedAt,
        registeredBy: status === 'present' ? 'Terminal do vereador' : 'Sérgio Antunes Moreira',
        justification: status === 'justified' ? 'Atestado médico apresentado à Secretaria.' : undefined,
      }
    }),
  )

/* ---------- Pautas ---------- */

const item = (id: string, order: number, propositionId: string, status: AgendaItem['status'], section: AgendaItem['section'] = 'order_of_day'): AgendaItem => {
  const p = propositionsSeed.find((x) => x.id === propositionId)!
  return { id, order, propositionId, section, status, votingMethod: p.votingMethod, quorumRuleId: p.quorumRuleId, notes: '' }
}

export const agendasSeed: Agenda[] = [
  {
    id: 'ag_ord_13',
    sessionId: 'ss_ord_13',
    status: 'published',
    publishedAt: '2026-09-19T15:00:00.000Z',
    items: [item('ai_13_1', 1, 'pp_pl023', 'voted'), item('ai_13_2', 2, 'pp_pl022', 'voted'), item('ai_13_3', 3, 'pp_pl017', 'voted')],
  },
  {
    id: 'ag_ext_03',
    sessionId: 'ss_ext_03',
    status: 'published',
    publishedAt: '2026-09-23T12:00:00.000Z',
    items: [item('ai_e3_1', 1, 'pp_pdl003', 'voted'), item('ai_e3_2', 2, 'pp_pl021', 'voted')],
  },
  {
    id: 'ag_ord_14',
    sessionId: 'ss_ord_14',
    status: 'published',
    publishedAt: '2026-09-26T15:00:00.000Z',
    items: [item('ai_14_1', 1, 'pp_pl024', 'voted'), item('ai_14_2', 2, 'pp_req111', 'voted'), item('ai_14_3', 3, 'pp_req110', 'voted'), item('ai_14_4', 4, 'pp_moc017', 'voted')],
  },
  {
    id: 'ag_ord_15',
    sessionId: DEMO_SESSION_ID,
    status: 'published',
    publishedAt: '2026-10-03T15:00:00.000Z',
    items: [item('ai_15_1', 1, 'pp_pl025', 'pending'), item('ai_15_2', 2, 'pp_pl026', 'pending'), item('ai_15_3', 3, 'pp_req112', 'pending'), item('ai_15_4', 4, 'pp_moc018', 'pending')],
  },
  {
    id: 'ag_ord_16',
    sessionId: 'ss_ord_16',
    status: 'draft',
    items: [item('ai_16_1', 1, 'pp_pl029', 'pending'), item('ai_16_2', 2, 'pp_pr007', 'pending')],
  },
]

/* ---------- Impedimentos ---------- */

export const impedimentsSeed: Impediment[] = [
  {
    id: 'im_01',
    councilorId: 'cv_01',
    propositionId: 'pp_pdl003',
    kind: 'suspicion',
    reason: 'Autor da homenagem declarou-se suspeito por vínculo familiar com o homenageado.',
    registeredBy: 'Sérgio Antunes Moreira',
    registeredAt: '2026-09-24T21:05:00.000Z',
    documentName: 'Declaracao-de-suspeicao-PDL-003-2026.pdf',
  },
]

/* ---------- Votações encerradas (geradas e apuradas pelo VotingEngine) ---------- */

type Pattern = Partial<Record<string, VoteChoice>>

interface PastVoting {
  id: string
  sessionId: string
  agendaItemId: string
  propositionId: string
  openedAt: string
  votes?: Pattern
  defaultChoice?: VoteChoice
  symbolic?: { yes: number; no: number; abstention: number }
}

const PAST: PastVoting[] = [
  { id: 'vt_13_1', sessionId: 'ss_ord_13', agendaItemId: 'ai_13_1', propositionId: 'pp_pl023', openedAt: '2026-09-22T22:40:00.000Z', defaultChoice: 'yes' },
  {
    id: 'vt_13_2',
    sessionId: 'ss_ord_13',
    agendaItemId: 'ai_13_2',
    propositionId: 'pp_pl022',
    openedAt: '2026-09-22T23:15:00.000Z',
    defaultChoice: 'no',
    votes: { cv_03: 'yes', cv_05: 'yes', cv_11: 'yes', cv_06: 'abstention' },
  },
  { id: 'vt_13_3', sessionId: 'ss_ord_13', agendaItemId: 'ai_13_3', propositionId: 'pp_pl017', openedAt: '2026-09-22T23:50:00.000Z', defaultChoice: 'no', votes: { cv_08: 'yes', cv_04: 'yes', cv_12: 'abstention' } },
  { id: 'vt_e3_1', sessionId: 'ss_ext_03', agendaItemId: 'ai_e3_1', propositionId: 'pp_pdl003', openedAt: '2026-09-24T21:15:00.000Z', defaultChoice: 'yes', votes: { cv_09: 'abstention' } },
  { id: 'vt_e3_2', sessionId: 'ss_ext_03', agendaItemId: 'ai_e3_2', propositionId: 'pp_pl021', openedAt: '2026-09-24T21:50:00.000Z', defaultChoice: 'yes', votes: { cv_03: 'no' } },
  { id: 'vt_14_1', sessionId: 'ss_ord_14', agendaItemId: 'ai_14_1', propositionId: 'pp_pl024', openedAt: '2026-09-29T22:30:00.000Z', defaultChoice: 'yes', votes: { cv_07: 'abstention' } },
  { id: 'vt_14_2', sessionId: 'ss_ord_14', agendaItemId: 'ai_14_2', propositionId: 'pp_req111', openedAt: '2026-09-29T23:05:00.000Z', defaultChoice: 'yes', votes: { cv_05: 'no', cv_11: 'no', cv_03: 'abstention' } },
  { id: 'vt_14_3', sessionId: 'ss_ord_14', agendaItemId: 'ai_14_3', propositionId: 'pp_req110', openedAt: '2026-09-29T23:30:00.000Z', symbolic: { yes: 10, no: 0, abstention: 0 } },
  { id: 'vt_14_4', sessionId: 'ss_ord_14', agendaItemId: 'ai_14_4', propositionId: 'pp_moc017', openedAt: '2026-09-29T23:45:00.000Z', symbolic: { yes: 10, no: 0, abstention: 0 } },
]

let voteSequence = 100

function buildPast(pv: PastVoting): { voting: Voting; votes: Vote[] } {
  const p = propositionsSeed.find((x) => x.id === pv.propositionId)!
  const rule = quorumRulesSeed.find((q) => q.id === p.quorumRuleId)!
  const presentIds = attendanceSeed.filter((a) => a.sessionId === pv.sessionId && a.status === 'present').map((a) => a.councilorId)
  const impededIds = impedimentsSeed.filter((i) => i.propositionId === p.id).map((i) => i.councilorId)
  const method = pv.symbolic ? 'symbolic' : p.votingMethod
  const eligibleIds = getEligibleVoters({
    memberIds: MEMBERS,
    presentIds,
    impededIds,
    presidentId: PRESIDENT,
    presidentRule: settingsSeed.presidentRule,
    quorumType: rule.type,
    method,
  })
  const opened = new Date(pv.openedAt)
  const votes: Vote[] =
    method === 'symbolic'
      ? []
      : eligibleIds.map((councilorId, i) => ({
          id: `vo_${pv.id}_${councilorId}`,
          code: formatVoteCode(2026, ++voteSequence),
          votingId: pv.id,
          sessionId: pv.sessionId,
          propositionId: p.id,
          councilorId: method === 'secret' ? null : councilorId,
          choice: pv.votes?.[councilorId] ?? pv.defaultChoice ?? 'yes',
          castAt: new Date(opened.getTime() + (12 + i * 7) * 1000).toISOString(),
          device: `Tablet Plenário ${String(MEMBERS.indexOf(councilorId) + 1).padStart(2, '0')}`,
        }))
  const closedAt = new Date(opened.getTime() + 110_000).toISOString()
  const base: Voting = {
    id: pv.id,
    sessionId: pv.sessionId,
    agendaItemId: pv.agendaItemId,
    propositionId: p.id,
    method,
    quorumRule: rule,
    status: 'closed',
    round: 1,
    durationSeconds: settingsSeed.voting.defaultDurationSeconds,
    automaticClose: false,
    openedAt: pv.openedAt,
    closesAt: new Date(opened.getTime() + 120_000).toISOString(),
    closedAt,
    openedBy: 'João Martins',
    closedBy: 'João Martins',
    memberIds: MEMBERS,
    presentIds,
    impededIds,
    eligibleIds,
    presidentId: PRESIDENT,
    participantIds: method === 'symbolic' ? [] : eligibleIds,
    symbolicTally: pv.symbolic,
  }
  const result = calculateResult({
    rule,
    tally: tallyVotes(base, votes),
    presidentRule: settingsSeed.presidentRule,
    deliberationQuorum: settingsSeed.voting.deliberationQuorum,
    tieOutcome: settingsSeed.voting.tieOutcome,
    now: closedAt,
  })
  return { voting: { ...base, result }, votes }
}

const built = PAST.map(buildPast)
export const votingsSeed: Voting[] = built.map((b) => b.voting)
export const votesSeed: Vote[] = built.flatMap((b) => b.votes)
export const VOTE_SEQUENCE_START = voteSequence
