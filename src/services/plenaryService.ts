import type { Agenda, AgendaItem, AgendaItemStatus, Attendance, AttendanceStatus, ID, Impediment, Session, SessionStatus, Vote, VoteChoice, Voting } from '@/types'
import { dataSource, type CollectionName } from '@/repositories'
import { getDeliberationQuorum } from '@/domain/quorum/quorumEngine'
import { calculateResult, canCouncilorVote, formatVoteCode, getEligibleVoters, OUTCOME_LABEL, tallyVotes, VOTE_DENIAL_LABEL } from '@/domain/voting/votingEngine'
import { propositionCode } from '@/domain/legislative/process'
import { AttendanceStatusMeta, SessionStatusMeta, SessionTypeLabel, VoteChoiceMeta, VotingMethodLabel } from '@/domain/labels'
import { currentUser } from '@/stores/authStore'
import { uid } from '@/lib/utils'
import { audit, broadcast, notify } from './activity'

/**
 * Service da sessão plenária: presença, pauta, Ordem do Dia e votação eletrônica.
 * Toda regra de votação é delegada ao VotingEngine/QuorumEngine (funções puras).
 *
 * IMPORTANTE (fase 2): castVote/closeVoting devem virar RPCs transacionais no backend,
 * com constraint única (voting_id, councilor_id) e verificação de janela de votação no servidor.
 */

const col = <K extends CollectionName>(name: K) => dataSource.collection(name)

const sessionLabel = (s: Session) => `${SessionTypeLabel[s.type]} nº ${s.number}/${s.year}`
const userName = () => currentUser()?.name ?? 'Sistema'

async function getSession(id: ID) {
  const s = await col('sessions').get(id)
  if (!s) throw new Error('Sessão não encontrada.')
  return s
}

async function getAgenda(sessionId: ID) {
  return (await col('agendas').list()).find((a) => a.sessionId === sessionId) ?? null
}

async function propLabel(propositionId: ID) {
  const [p, settings] = await Promise.all([col('propositions').get(propositionId), dataSource.document('settings').get()])
  return p ? propositionCode(p, settings.propositionTypes.find((t) => t.id === p.typeId)) : propositionId
}

async function activeMemberIds() {
  const org = await dataSource.document('organization').get()
  return (await col('councilors').list()).filter((c) => c.status === 'active' && c.legislatureId === org.currentLegislatureId).map((c) => c.id)
}

async function setItemStatus(sessionId: ID, itemId: ID, status: AgendaItemStatus, extra: Partial<AgendaItem> = {}) {
  const agenda = await getAgenda(sessionId)
  if (!agenda) throw new Error('Pauta não encontrada.')
  const items = agenda.items.map((i) => (i.id === itemId ? { ...i, status, ...extra } : i))
  await col('agendas').update(agenda.id, { items })
  return items.find((i) => i.id === itemId)!
}

async function openVotingFor(sessionId: ID) {
  return (await col('votings').list()).find((v) => v.sessionId === sessionId && (v.status === 'open' || v.status === 'preparing')) ?? null
}

/* =================== Sessão =================== */

export const sessionLifecycle = {
  async setStatus(sessionId: ID, status: SessionStatus) {
    const s = await getSession(sessionId)
    if (status === 'closed' && (await openVotingFor(sessionId))) throw new Error('Há votação em andamento. Encerre ou anule a votação antes de encerrar a sessão.')
    const now = new Date()
    const patch: Partial<Session> = { status }
    if ((status === 'open' || status === 'in_progress') && !s.openedAt) patch.openedAt = now.toISOString()
    if (status === 'closed') {
      patch.closedAt = now.toISOString()
      patch.endTime = now.toTimeString().slice(0, 5)
    }
    await col('sessions').update(sessionId, patch)

    if (status === 'open' && s.status === 'scheduled') {
      // Abre a lista de presença para todos os membros ainda sem registro.
      const existing = (await col('attendance').list()).filter((a) => a.sessionId === sessionId)
      const members = await activeMemberIds()
      await col('attendance').upsertMany(
        members.filter((m) => !existing.some((a) => a.councilorId === m)).map<Attendance>((councilorId) => ({ id: `at_${sessionId}_${councilorId}`, sessionId, councilorId, status: 'pending' })),
      )
      await notify({ title: 'Sessão aberta', message: `${sessionLabel(s)} foi aberta. Registre sua presença.`, category: 'session', link: '/vereador/votacao' })
    }

    await audit({ operation: `Sessão: ${SessionStatusMeta[status].label}`, module: 'sessions', recordId: sessionId, recordLabel: sessionLabel(s), details: `Alteração de situação da sessão`, before: SessionStatusMeta[s.status].label, after: SessionStatusMeta[status].label })
    broadcast({
      type: status === 'closed' || status === 'cancelled' ? 'SESSION_ENDED' : 'SESSION_STARTED',
      sessionId,
      collections: ['sessions', 'attendance', 'notifications'],
    })
  },
}

/* =================== Presença =================== */

export const attendanceService = {
  async set(sessionId: ID, councilorId: ID, status: AttendanceStatus, justification?: string) {
    const s = await getSession(sessionId)
    const id = `at_${sessionId}_${councilorId}`
    const before = await col('attendance').get(id)
    const record: Attendance = { id, sessionId, councilorId, status, justification, registeredAt: new Date().toISOString(), registeredBy: userName() }
    await col('attendance').upsertMany([record])
    const c = await col('councilors').get(councilorId)
    await audit({
      operation: 'Registro de presença',
      module: 'attendance',
      recordId: id,
      recordLabel: `${c?.parliamentaryName ?? councilorId} — ${sessionLabel(s)}`,
      details: justification ? `Justificativa: ${justification}` : AttendanceStatusMeta[status].label,
      before: AttendanceStatusMeta[before?.status ?? 'pending'].label,
      after: AttendanceStatusMeta[status].label,
      origin: currentUser()?.role === 'councilor' ? 'tablet' : 'web',
    })
    broadcast({ type: 'DATA_CHANGED', sessionId, collections: ['attendance'] })
  },

  async setAll(sessionId: ID, status: AttendanceStatus) {
    const members = await activeMemberIds()
    const existing = (await col('attendance').list()).filter((a) => a.sessionId === sessionId)
    const now = new Date().toISOString()
    await col('attendance').upsertMany(
      members
        .filter((m) => (existing.find((a) => a.councilorId === m)?.status ?? 'pending') === 'pending')
        .map((councilorId) => ({ id: `at_${sessionId}_${councilorId}`, sessionId, councilorId, status, registeredAt: now, registeredBy: userName() })),
    )
    const s = await getSession(sessionId)
    await audit({ operation: 'Registro de presença em lote', module: 'attendance', recordId: sessionId, recordLabel: sessionLabel(s), details: `Pendentes marcados como ${AttendanceStatusMeta[status].label}` })
    broadcast({ type: 'DATA_CHANGED', sessionId, collections: ['attendance'] })
  },
}

/* =================== Pauta =================== */

export const agendaService = {
  async save(sessionId: ID, items: AgendaItem[]) {
    const s = await getSession(sessionId)
    const existing = await getAgenda(sessionId)
    const normalized = items.map((i, idx) => ({ ...i, order: idx + 1 }))
    const agenda: Agenda = existing ? { ...existing, items: normalized } : { id: uid('ag'), sessionId, status: 'draft', items: normalized }
    if (existing) await col('agendas').update(agenda.id, agenda)
    else await col('agendas').create(agenda)

    // Matérias em pauta passam a "Em pauta"; removidas voltam para "Apta para pauta".
    const added = normalized.filter((i) => !existing?.items.some((e) => e.propositionId === i.propositionId))
    const removed = existing?.items.filter((e) => !normalized.some((i) => i.propositionId === e.propositionId)) ?? []
    for (const i of added) await col('propositions').update(i.propositionId, { status: 'on_agenda', stage: 'agenda' })
    for (const i of removed) await col('propositions').update(i.propositionId, { status: 'ready_for_agenda', stage: 'agenda' })

    await audit({
      operation: existing ? 'Alteração da pauta' : 'Criação de pauta',
      module: 'agendas',
      recordId: agenda.id,
      recordLabel: `Pauta — ${sessionLabel(s)}`,
      details: `${normalized.length} item(ns); incluídos: ${added.length}; removidos: ${removed.length}`,
    })
    if (existing?.status === 'published' && (added.length || removed.length))
      await notify({ title: 'Alteração da pauta', message: `A pauta da ${sessionLabel(s)} foi alterada.`, category: 'session', link: '/admin/pautas' })
    broadcast({ type: 'AGENDA_ITEM_CHANGED', sessionId, collections: ['agendas', 'propositions', 'notifications'] })
    return agenda
  },

  async publish(sessionId: ID) {
    const agenda = await getAgenda(sessionId)
    if (!agenda || agenda.items.length === 0) throw new Error('A pauta não possui itens.')
    const s = await getSession(sessionId)
    await col('agendas').update(agenda.id, { status: 'published', publishedAt: new Date().toISOString() })
    await audit({ operation: 'Publicação de pauta', module: 'agendas', recordId: agenda.id, recordLabel: `Pauta — ${sessionLabel(s)}`, details: `${agenda.items.length} itens`, before: 'Rascunho', after: 'Publicada' })
    await notify({ title: 'Projeto incluído na pauta', message: `Pauta da ${sessionLabel(s)} publicada com ${agenda.items.length} itens.`, category: 'session', link: '/transparencia/pautas' })
    broadcast({ type: 'AGENDA_ITEM_CHANGED', sessionId, collections: ['agendas', 'notifications'] })
  },
}

/* =================== Ordem do Dia =================== */

export const orderOfDayService = {
  async startItem(sessionId: ID, itemId: ID) {
    const s = await getSession(sessionId)
    if (await openVotingFor(sessionId)) throw new Error('Encerre a votação em andamento antes de mudar de item.')
    if (s.status === 'scheduled' || s.status === 'closed' || s.status === 'cancelled') throw new Error('A sessão precisa estar aberta.')
    const item = await setItemStatus(sessionId, itemId, 'reading')
    await col('sessions').update(sessionId, { currentAgendaItemId: itemId, status: 'in_progress' })
    await col('propositions').update(item.propositionId, { stage: 'order_of_day', status: 'on_agenda' })
    await audit({ operation: 'Início de item da Ordem do Dia', module: 'order_of_day', recordId: itemId, recordLabel: await propLabel(item.propositionId), details: `Item ${item.order} — ${sessionLabel(s)}` })
    broadcast({ type: 'AGENDA_ITEM_CHANGED', sessionId, collections: ['agendas', 'sessions', 'propositions'] })
  },

  async openDiscussion(sessionId: ID, itemId: ID) {
    const item = await setItemStatus(sessionId, itemId, 'discussion', { discussionStartedAt: new Date().toISOString() })
    await col('propositions').update(item.propositionId, { stage: 'discussion' })
    await audit({ operation: 'Abertura de discussão', module: 'order_of_day', recordId: itemId, recordLabel: await propLabel(item.propositionId), details: 'Discussão aberta' })
    broadcast({ type: 'DISCUSSION_STARTED', sessionId, collections: ['agendas', 'propositions'] })
  },

  async closeDiscussion(sessionId: ID, itemId: ID) {
    const item = await setItemStatus(sessionId, itemId, 'discussion_closed', { discussionEndedAt: new Date().toISOString() })
    await audit({ operation: 'Encerramento de discussão', module: 'order_of_day', recordId: itemId, recordLabel: await propLabel(item.propositionId), details: 'Discussão encerrada' })
    broadcast({ type: 'DISCUSSION_ENDED', sessionId, collections: ['agendas'] })
  },

  async setItemOutcome(sessionId: ID, itemId: ID, status: 'postponed' | 'withdrawn') {
    if (await openVotingFor(sessionId)) throw new Error('Há votação em andamento.')
    const item = await setItemStatus(sessionId, itemId, status)
    await col('propositions').update(item.propositionId, { status: 'ready_for_agenda', stage: 'agenda' })
    await audit({ operation: status === 'postponed' ? 'Adiamento de item' : 'Retirada de pauta', module: 'order_of_day', recordId: itemId, recordLabel: await propLabel(item.propositionId), details: status })
    broadcast({ type: 'AGENDA_ITEM_CHANGED', sessionId, collections: ['agendas', 'propositions'] })
  },

  /** Avança para o próximo item pendente; retorna o id ou null se a pauta terminou. */
  async nextItem(sessionId: ID) {
    const s = await getSession(sessionId)
    const agenda = await getAgenda(sessionId)
    const items = [...(agenda?.items ?? [])].sort((a, b) => a.order - b.order)
    const currentOrder = items.find((i) => i.id === s.currentAgendaItemId)?.order ?? 0
    const next = items.find((i) => i.order > currentOrder && i.status === 'pending') ?? items.find((i) => i.status === 'pending')
    if (!next) return null
    await this.startItem(sessionId, next.id)
    return next.id
  },
}

/* =================== Impedimentos =================== */

export const impedimentService = {
  async add(input: Omit<Impediment, 'id' | 'registeredAt' | 'registeredBy'>) {
    const exists = (await col('impediments').list()).some((i) => i.councilorId === input.councilorId && i.propositionId === input.propositionId)
    if (exists) throw new Error('Impedimento já registrado para este vereador nesta matéria.')
    const imp: Impediment = { ...input, id: uid('im'), registeredAt: new Date().toISOString(), registeredBy: userName() }
    await col('impediments').create(imp)
    const c = await col('councilors').get(input.councilorId)
    await audit({ operation: input.kind === 'impediment' ? 'Registro de impedimento' : 'Registro de suspeição', module: 'voting', recordId: imp.id, recordLabel: `${c?.parliamentaryName} — ${await propLabel(input.propositionId)}`, details: input.reason, after: 'Impedido' })
    broadcast({ type: 'DATA_CHANGED', collections: ['impediments'] })
  },
  async remove(id: ID) {
    const imp = await col('impediments').get(id)
    if (!imp) return
    await col('impediments').remove(id)
    await audit({ operation: 'Remoção de impedimento', module: 'voting', recordId: id, recordLabel: await propLabel(imp.propositionId), details: imp.reason, before: 'Impedido', after: 'Apto' })
    broadcast({ type: 'DATA_CHANGED', collections: ['impediments'] })
  },
}

/* =================== Votação =================== */

const votingOperations = {
  async start(sessionId: ID, itemId: ID, options: { durationSeconds?: number; automaticClose?: boolean } = {}) {
    const s = await getSession(sessionId)
    if (!['open', 'in_progress'].includes(s.status)) throw new Error('A sessão precisa estar aberta e não suspensa.')
    if (await openVotingFor(sessionId)) throw new Error('Já existe votação aberta nesta sessão.')
    const agenda = await getAgenda(sessionId)
    const item = agenda?.items.find((i) => i.id === itemId)
    if (!item) throw new Error('Item de pauta não encontrado.')
    const [settings, org] = await Promise.all([dataSource.document('settings').get(), dataSource.document('organization').get()])
    const rule = settings.quorumRules.find((q) => q.id === item.quorumRuleId)
    if (!rule) throw new Error('Regra de quórum do item não encontrada nas configurações.')

    const memberIds = await activeMemberIds()
    const attendance = (await col('attendance').list()).filter((a) => a.sessionId === sessionId)
    const presentIds = attendance.filter((a) => a.status === 'present').map((a) => a.councilorId)
    const impededIds = (await col('impediments').list()).filter((i) => i.propositionId === item.propositionId).map((i) => i.councilorId)

    const minimum = getDeliberationQuorum(Math.max(memberIds.length, org.councilSeats), settings.voting.deliberationQuorum)
    if (presentIds.length < minimum && settings.voting.withoutQuorumBehavior === 'block')
      throw new Error(`Quórum insuficiente: ${presentIds.length} presentes, mínimo ${minimum}.`)

    const eligibleIds = getEligibleVoters({ memberIds, presentIds, impededIds, presidentId: s.presidentId, presidentRule: settings.presidentRule, quorumType: rule.type, method: item.votingMethod })
    const previous = (await col('votings').list()).filter((v) => v.agendaItemId === itemId)
    const duration = options.durationSeconds ?? settings.voting.defaultDurationSeconds
    const now = new Date()
    const voting: Voting = {
      id: uid('vt'),
      sessionId,
      agendaItemId: itemId,
      propositionId: item.propositionId,
      method: item.votingMethod,
      quorumRule: rule,
      status: 'open',
      round: previous.length + 1,
      durationSeconds: duration,
      automaticClose: options.automaticClose ?? settings.voting.automaticClose,
      openedAt: now.toISOString(),
      closesAt: new Date(now.getTime() + duration * 1000).toISOString(),
      openedBy: userName(),
      memberIds,
      presentIds,
      impededIds,
      eligibleIds,
      presidentId: s.presidentId,
      participantIds: [],
      symbolicTally: item.votingMethod === 'symbolic' ? { yes: 0, no: 0, abstention: 0 } : undefined,
    }
    await col('votings').create(voting)
    await setItemStatus(sessionId, itemId, 'voting')
    await col('propositions').update(item.propositionId, { status: 'in_voting', stage: 'voting' })
    const code = await propLabel(item.propositionId)
    await audit({
      operation: 'Abertura de votação',
      module: 'voting',
      recordId: voting.id,
      recordLabel: code,
      details: `Votação ${VotingMethodLabel[voting.method].toLowerCase()} · ${rule.name} · ${duration} s · ${eligibleIds.length} aptos${presentIds.length < minimum ? ' · ALERTA: sem quórum de deliberação' : ''}`,
      before: 'Item em discussão',
      after: 'Votação aberta',
    })
    await notify({ title: 'Votação iniciada', message: `${code} em votação na ${sessionLabel(s)}.`, category: 'voting', link: '/vereador/votacao' })
    broadcast({ type: 'VOTING_STARTED', sessionId, votingId: voting.id, collections: ['votings', 'agendas', 'propositions', 'notifications'] })
    return voting
  },

  async castVote(votingId: ID, councilorId: ID, choice: VoteChoice): Promise<Vote> {
    const voting = await col('votings').get(votingId)
    if (!voting) throw new Error('Votação não encontrada.')
    const check = canCouncilorVote(voting, councilorId)
    if (!check.allowed) throw new Error(VOTE_DENIAL_LABEL[check.reason])
    const settings = await dataSource.document('settings').get()
    if (choice === 'abstention' && !settings.voting.allowAbstention) throw new Error('Abstenção não permitida pela configuração.')

    const sequence = await dataSource.nextSequence('vote')
    const now = new Date()
    const vote: Vote = {
      id: uid('vo'),
      code: formatVoteCode(now.getFullYear(), sequence),
      votingId,
      sessionId: voting.sessionId,
      propositionId: voting.propositionId,
      councilorId: voting.method === 'secret' ? null : councilorId,
      choice,
      castAt: now.toISOString(),
      device: 'Terminal do vereador',
    }
    // O lock local serializa votos/encerramento entre abas. Rollback evita participação sem voto.
    await col('votes').create(vote)
    try {
      await col('votings').update(votingId, { participantIds: [...voting.participantIds, councilorId] })
    } catch (error) {
      await col('votes').remove(vote.id)
      throw error
    }

    const c = await col('councilors').get(councilorId)
    const s = await getSession(voting.sessionId)
    await audit({
      operation: 'Registro de voto',
      module: 'voting',
      recordId: voting.method === 'secret' ? voting.id : vote.code,
      recordLabel: await propLabel(voting.propositionId),
      origin: 'tablet',
      // Votação secreta: auditoria registra a participação, nunca o conteúdo do voto.
      details: voting.method === 'secret' ? `Participação registrada (voto secreto) · ${sessionLabel(s)}` : `Voto: ${VoteChoiceMeta[choice].label} · ${sessionLabel(s)}`,
      after: voting.method === 'secret' ? 'Participação registrada, sem vínculo com a cédula.' : `Identificador ${vote.code}`,
      notes: `Vereador: ${c?.parliamentaryName ?? councilorId}`,
    })
    broadcast({ type: 'VOTE_REGISTERED', sessionId: voting.sessionId, votingId, collections: ['votings', 'votes'] })
    return vote
  },

  async setSymbolicTally(votingId: ID, tally: { yes: number; no: number; abstention: number }) {
    const voting = await col('votings').get(votingId)
    if (!voting || voting.status !== 'open') throw new Error('Votação não está aberta.')
    if (voting.method !== 'symbolic') throw new Error('A contagem declarada é exclusiva da votação simbólica.')
    if (Object.values(tally).some((n) => !Number.isInteger(n) || n < 0)) throw new Error('Informe contagens inteiras e não negativas.')
    const total = tally.yes + tally.no + tally.abstention
    if (total > voting.eligibleIds.length) throw new Error(`O total declarado (${total}) excede o número de aptos (${voting.eligibleIds.length}).`)
    await col('votings').update(votingId, { symbolicTally: tally })
    broadcast({ type: 'VOTE_REGISTERED', sessionId: voting.sessionId, votingId, collections: ['votings'] })
  },

  async close(votingId: ID, options: { tiebreakVote?: VoteChoice; automatic?: boolean } = {}) {
    const voting = await col('votings').get(votingId)
    if (!voting) throw new Error('Votação não encontrada.')
    if (voting.status !== 'open') return voting
    const settings = await dataSource.document('settings').get()
    const votes = (await col('votes').list()).filter((v) => v.votingId === votingId)
    const now = new Date().toISOString()
    const result = calculateResult({
      rule: voting.quorumRule,
      tally: tallyVotes(voting, votes),
      presidentRule: settings.presidentRule,
      deliberationQuorum: settings.voting.deliberationQuorum,
      tieOutcome: settings.voting.tieOutcome,
      tiebreakVote: options.tiebreakVote,
      now,
    })
    const closed: Partial<Voting> = { status: 'closed', closedAt: now, closedBy: options.automatic ? 'Encerramento automático' : userName(), result, tiebreakVote: options.tiebreakVote }
    await col('votings').update(votingId, closed)
    await setItemStatus(voting.sessionId, voting.agendaItemId, 'voted')

    const approved = result.outcome === 'approved'
    const p = await col('propositions').get(voting.propositionId)
    const type = (await dataSource.document('settings').get()).propositionTypes.find((t) => t.id === p?.typeId)
    if (p) {
      await col('propositions').update(p.id, {
        status: result.outcome === 'no_quorum' || result.outcome === 'tie' ? 'ready_for_agenda' : approved ? 'approved' : 'rejected',
        stage: result.outcome === 'no_quorum' || result.outcome === 'tie' ? 'agenda' : approved && type?.goesToSanction ? 'sanction_veto' : 'result',
        updatedAt: now,
      })
      await col('movements').create({
        id: uid('mv'),
        propositionId: p.id,
        at: now,
        from: 'Plenário',
        to: 'Presidência',
        action: 'Votação em Plenário',
        stage: 'result',
        responsible: userName(),
        notes: `${OUTCOME_LABEL[result.outcome]} — SIM ${result.yes} · NÃO ${result.no} · ABSTENÇÕES ${result.abstention}. ${result.explanation}`,
        documents: [],
      })
    }
    const code = await propLabel(voting.propositionId)
    const s = await getSession(voting.sessionId)
    await audit({
      operation: options.automatic ? 'Encerramento automático de votação' : 'Encerramento de votação',
      module: 'voting',
      recordId: votingId,
      recordLabel: code,
      details: `Resultado: ${OUTCOME_LABEL[result.outcome]} (SIM ${result.yes}, NÃO ${result.no}, ABSTENÇÃO ${result.abstention}, NÃO VOTARAM ${result.notVoted})${result.tieBrokenByPresident ? ' · desempate do Presidente' : ''}`,
      before: 'Votação aberta',
      after: `Encerrada — ${OUTCOME_LABEL[result.outcome]}`,
    })
    await notify({ title: 'Resultado disponível', message: `${code}: ${OUTCOME_LABEL[result.outcome]} na ${sessionLabel(s)} (SIM ${result.yes} · NÃO ${result.no} · ABST. ${result.abstention}).`, category: 'voting', link: '/plenario/resultado' })
    broadcast({ type: 'VOTING_ENDED', sessionId: voting.sessionId, votingId, collections: ['votings', 'agendas', 'propositions', 'movements', 'notifications'] })
    broadcast({ type: 'RESULT_PUBLISHED', sessionId: voting.sessionId, votingId, collections: [] })
    return { ...voting, ...closed }
  },

  async cancel(votingId: ID, reason: string) {
    const voting = await col('votings').get(votingId)
    if (!voting) throw new Error('Votação não encontrada.')
    if (voting.status === 'cancelled') return
    await col('votings').update(votingId, { status: 'cancelled', cancelReason: reason, closedAt: new Date().toISOString(), closedBy: userName() })
    await setItemStatus(voting.sessionId, voting.agendaItemId, 'discussion_closed')
    await col('propositions').update(voting.propositionId, { status: 'on_agenda', stage: 'discussion' })
    await audit({ operation: 'Anulação de votação', module: 'voting', recordId: votingId, recordLabel: await propLabel(voting.propositionId), details: `Motivo: ${reason}`, before: voting.status === 'open' ? 'Votação aberta' : 'Votação encerrada', after: 'Anulada' })
    broadcast({ type: 'VOTING_CANCELLED', sessionId: voting.sessionId, votingId, collections: ['votings', 'agendas', 'propositions'] })
  },

  /** Reabre o item para nova votação (nova rodada). A votação anterior permanece no histórico. */
  async reopen(votingId: ID, reason: string) {
    const settings = await dataSource.document('settings').get()
    if (!settings.voting.allowReopen) throw new Error('A reabertura de votação está desabilitada nas configurações.')
    const voting = await col('votings').get(votingId)
    if (!voting) throw new Error('Votação não encontrada.')
    if (voting.status === 'closed') await this.cancel(votingId, `Reabertura: ${reason}`)
    await audit({ operation: 'Reabertura de votação', module: 'voting', recordId: votingId, recordLabel: await propLabel(voting.propositionId), details: `Motivo: ${reason}` })
    return this.start(voting.sessionId, voting.agendaItemId)
  },
}

/** ponytail: coordena apenas abas do mesmo navegador; produção exige transação RPC no backend. */
function withVotingLock<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return (...args: A): Promise<R> => {
    if (!navigator.locks) return Promise.reject(new Error('Este navegador não suporta coordenação de votação entre abas. Use Chrome, Edge ou Firefox atualizado.'))
    return navigator.locks.request('spl:plenary-voting', () => fn(...args))
  }
}

export const votingService = {
  start: withVotingLock(votingOperations.start.bind(votingOperations)),
  castVote: withVotingLock(votingOperations.castVote.bind(votingOperations)),
  setSymbolicTally: withVotingLock(votingOperations.setSymbolicTally.bind(votingOperations)),
  close: withVotingLock(votingOperations.close.bind(votingOperations)),
  cancel: withVotingLock(votingOperations.cancel.bind(votingOperations)),
  reopen: withVotingLock(votingOperations.reopen.bind(votingOperations)),
}
