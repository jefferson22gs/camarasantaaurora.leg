import type { DocumentRef, ID, Opinion, ProcessMovement, ProcessStage, Proposition, PropositionStatus } from '@/types'
import { dataSource } from '@/repositories'
import { nextPropositionNumber, propositionCode } from '@/domain/legislative/process'
import { PropositionStatusMeta } from '@/domain/labels'
import { currentUser } from '@/stores/authStore'
import { uid } from '@/lib/utils'
import { audit, broadcast, notify } from './activity'

/** Situação sugerida ao mover a matéria para uma etapa (pode ser sobrescrita pelo usuário). */
export const STAGE_DEFAULT_STATUS: Partial<Record<ProcessStage, PropositionStatus>> = {
  protocol: 'filed',
  analysis: 'in_analysis',
  referral: 'in_analysis',
  committee: 'in_committee',
  opinion: 'in_committee',
  agenda: 'ready_for_agenda',
  order_of_day: 'on_agenda',
  discussion: 'on_agenda',
  voting: 'in_voting',
  publication: 'sanctioned',
  archiving: 'archived',
}

export type PropositionInput = Omit<Proposition, 'id' | 'number' | 'protocolNumber' | 'createdAt' | 'updatedAt' | 'stage' | 'attachments'> & {
  number?: number
  attachments?: DocumentRef[]
}

async function label(p: Proposition) {
  const settings = await dataSource.document('settings').get()
  return propositionCode(p, settings.propositionTypes.find((t) => t.id === p.typeId))
}

export const propositionService = {
  async create(input: PropositionInput) {
    const repo = dataSource.collection('propositions')
    const all = await repo.list()
    const number = input.number ?? nextPropositionNumber(all, input.typeId, input.year)
    if (all.some((p) => p.typeId === input.typeId && p.year === input.year && p.number === number)) throw new Error(`Já existe proposição deste tipo com o número ${number}/${input.year}.`)
    const now = new Date().toISOString()
    const proposition: Proposition = {
      ...input,
      id: uid('pp'),
      number,
      attachments: input.attachments ?? [],
      stage: input.status === 'draft' ? 'proposition' : 'protocol',
      protocolNumber: `${input.year}${String(number).padStart(3, '0')}${Math.floor(Math.random() * 9)}`,
      createdAt: now,
      updatedAt: now,
    }
    await repo.create(proposition)
    const code = await label(proposition)
    if (proposition.stage === 'protocol') {
      await dataSource.collection('movements').create({
        id: uid('mv'),
        propositionId: proposition.id,
        at: now,
        from: 'Autor',
        to: 'Protocolo Geral',
        action: 'Protocolo e autuação',
        stage: 'protocol',
        responsible: currentUser()?.name ?? 'Sistema',
        notes: `Protocolo nº ${proposition.protocolNumber}`,
        documents: [],
      })
    }
    await audit({ operation: 'Cadastro de proposição', module: 'propositions', recordId: proposition.id, recordLabel: code, details: `Protocolo ${proposition.protocolNumber}`, after: `Situação: ${PropositionStatusMeta[proposition.status].label}` })
    await notify({ title: 'Novo projeto cadastrado', message: `${code} — ${proposition.summary.slice(0, 120)}`, category: 'proposition', link: `/admin/proposicoes/${proposition.id}` })
    broadcast({ type: 'DATA_CHANGED', collections: ['propositions', 'movements', 'notifications'] })
    return proposition
  },

  async update(id: ID, patch: Partial<Proposition>) {
    const before = await dataSource.collection('propositions').get(id)
    const updated = await dataSource.collection('propositions').update(id, { ...patch, updatedAt: new Date().toISOString() })
    await audit({
      operation: 'Alteração de proposição',
      module: 'propositions',
      recordId: id,
      recordLabel: await label(updated),
      details: `Campos: ${Object.keys(patch).join(', ')}`,
      before: before ? `Situação: ${PropositionStatusMeta[before.status].label}` : undefined,
      after: `Situação: ${PropositionStatusMeta[updated.status].label}`,
    })
    broadcast({ type: 'DATA_CHANGED', collections: ['propositions'] })
    return updated
  },

  async remove(id: ID) {
    const p = await dataSource.collection('propositions').get(id)
    if (!p) return
    const onAgenda = (await dataSource.collection('agendas').list()).some((a) => a.items.some((i) => i.propositionId === id))
    if (onAgenda || (await dataSource.collection('votings').list()).some((v) => v.propositionId === id))
      throw new Error('A proposição está vinculada a pauta ou votação. Utilize "Retirar" ou "Arquivar" para preservar o histórico.')
    await dataSource.collection('propositions').remove(id)
    const movements = (await dataSource.collection('movements').list()).filter((m) => m.propositionId === id)
    for (const m of movements) await dataSource.collection('movements').remove(m.id)
    await audit({ operation: 'Exclusão de proposição', module: 'propositions', recordId: id, recordLabel: await label(p), details: 'Proposição excluída', before: p.summary.slice(0, 200) })
    broadcast({ type: 'DATA_CHANGED', collections: ['propositions', 'movements'] })
  },

  /** Tramitação: registra a movimentação e atualiza etapa/situação. */
  async move(input: { propositionId: ID; stage: ProcessStage; to: string; action: string; notes: string; status?: PropositionStatus; documents?: DocumentRef[]; committeeId?: ID; rapporteurId?: ID }) {
    const p = await dataSource.collection('propositions').get(input.propositionId)
    if (!p) throw new Error('Proposição não encontrada.')
    const settings = await dataSource.document('settings').get()
    const fromUnit = settings.processFlow.find((s) => s.key === p.stage)?.unit ?? '—'
    const movement: ProcessMovement = {
      id: uid('mv'),
      propositionId: p.id,
      at: new Date().toISOString(),
      from: fromUnit,
      to: input.to,
      action: input.action,
      stage: input.stage,
      responsible: currentUser()?.name ?? 'Sistema',
      notes: input.notes,
      documents: input.documents ?? [],
    }
    await dataSource.collection('movements').create(movement)
    const status = input.status ?? STAGE_DEFAULT_STATUS[input.stage] ?? p.status
    const patch: Partial<Proposition> = { stage: input.stage, status, updatedAt: movement.at }
    if (input.committeeId && !p.committeeIds.includes(input.committeeId)) patch.committeeIds = [...p.committeeIds, input.committeeId]
    if (input.rapporteurId) patch.rapporteurId = input.rapporteurId
    await dataSource.collection('propositions').update(p.id, patch)

    // Distribuição à comissão cria parecer pendente automaticamente.
    if (input.committeeId && input.rapporteurId) {
      const exists = (await dataSource.collection('opinions').list()).some((o) => o.propositionId === p.id && o.committeeId === input.committeeId)
      if (!exists) await opinionService.save({ propositionId: p.id, committeeId: input.committeeId, rapporteurId: input.rapporteurId, status: 'pending' })
    }

    const code = await label(p)
    await audit({ operation: 'Tramitação', module: 'processes', recordId: p.id, recordLabel: code, details: `${input.action}: ${fromUnit} → ${input.to}`, before: `Etapa: ${p.stage}`, after: `Etapa: ${input.stage}` })
    await notify({ title: 'Projeto encaminhado', message: `${code}: ${input.action} (${fromUnit} → ${input.to}).`, category: 'proposition', link: `/admin/proposicoes/${p.id}` })
    broadcast({ type: 'DATA_CHANGED', collections: ['propositions', 'movements', 'opinions', 'notifications'] })
    return movement
  },

  async addAttachment(propositionId: ID, doc: DocumentRef) {
    const p = await dataSource.collection('propositions').get(propositionId)
    if (!p) return
    await dataSource.collection('propositions').update(p.id, { attachments: [...p.attachments, doc] })
    await audit({ operation: 'Inclusão de documento', module: 'propositions', recordId: p.id, recordLabel: await label(p), details: doc.name })
    broadcast({ type: 'DATA_CHANGED', collections: ['propositions'] })
  },

  async removeAttachment(propositionId: ID, docId: ID) {
    const p = await dataSource.collection('propositions').get(propositionId)
    if (!p) return
    const doc = p.attachments.find((d) => d.id === docId)
    await dataSource.collection('propositions').update(p.id, { attachments: p.attachments.filter((d) => d.id !== docId) })
    await audit({ operation: 'Remoção de documento', module: 'propositions', recordId: p.id, recordLabel: await label(p), details: doc?.name ?? docId })
    broadcast({ type: 'DATA_CHANGED', collections: ['propositions'] })
  },
}

export type OpinionInput = Partial<Opinion> & Pick<Opinion, 'propositionId' | 'committeeId' | 'rapporteurId'>

export const opinionService = {
  async save(input: OpinionInput) {
    const repo = dataSource.collection('opinions')
    const now = new Date().toISOString()
    const existing = input.id ? await repo.get(input.id) : null
    const opinion: Opinion = {
      id: uid('op'),
      dueDate: new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10),
      report: '',
      reasoning: '',
      conclusion: null,
      status: 'pending',
      attachments: [],
      createdAt: now,
      ...existing,
      ...input,
      updatedAt: now,
    }
    if (opinion.status === 'completed' && !opinion.issuedAt) opinion.issuedAt = now.slice(0, 10)
    if (existing) await repo.update(opinion.id, opinion)
    else await repo.create(opinion)

    const p = await dataSource.collection('propositions').get(opinion.propositionId)
    const code = p ? await label(p) : opinion.propositionId
    const committee = await dataSource.collection('committees').get(opinion.committeeId)
    await audit({
      operation: existing ? (opinion.status === 'completed' && existing.status !== 'completed' ? 'Emissão de parecer' : 'Alteração de parecer') : 'Cadastro de parecer',
      module: 'opinions',
      recordId: opinion.id,
      recordLabel: `${code} — ${committee?.acronym ?? ''}`,
      details: opinion.conclusion ? `Conclusão: ${opinion.conclusion}` : `Situação: ${opinion.status}`,
      before: existing?.status,
      after: opinion.status,
    })
    if (opinion.status === 'completed' && existing?.status !== 'completed')
      await notify({ title: 'Parecer emitido', message: `${committee?.acronym ?? 'Comissão'} concluiu parecer sobre ${code}.`, category: 'proposition', link: `/admin/proposicoes/${opinion.propositionId}` })
    broadcast({ type: 'DATA_CHANGED', collections: ['opinions', 'notifications'] })
    return opinion
  },

  async remove(id: ID) {
    const o = await dataSource.collection('opinions').get(id)
    if (!o) return
    if (o.status === 'completed') throw new Error('Pareceres concluídos não podem ser excluídos.')
    await dataSource.collection('opinions').remove(id)
    await audit({ operation: 'Exclusão de parecer', module: 'opinions', recordId: id, recordLabel: id, details: 'Parecer excluído' })
    broadcast({ type: 'DATA_CHANGED', collections: ['opinions'] })
  },
}

/** Simulação de upload: somente metadados (o arquivo não sai do navegador). */
export function fileToDocumentRef(file: File, kind: DocumentRef['kind'] = 'attachment'): DocumentRef {
  return {
    id: uid('doc'),
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    kind,
    uploadedAt: new Date().toISOString(),
    uploadedBy: currentUser()?.name ?? 'Sistema',
  }
}
