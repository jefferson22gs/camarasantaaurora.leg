import type {
  LegislativeProcess,
  ProcessMovement,
  ProcessStage,
  ProcessStageConfig,
  ProcessStep,
  Proposition,
  PropositionTypeConfig,
} from '@/types'

/**
 * Montagem do processo legislativo a partir do fluxo configurado pela Câmara
 * e das movimentações registradas. Função pura.
 */
export function buildLegislativeProcess(
  proposition: Proposition,
  flow: ProcessStageConfig[],
  movements: ProcessMovement[],
  type?: PropositionTypeConfig,
): LegislativeProcess {
  const stages = flow.filter((s) => s.enabled && isStageApplicable(s.key, type))
  const ordered = [...movements].sort((a, b) => a.at.localeCompare(b.at))
  const currentIndex = Math.max(
    0,
    stages.findIndex((s) => s.key === proposition.stage),
  )
  const finished = proposition.stage === 'archiving' && proposition.status === 'archived'

  const steps: ProcessStep[] = stages.map((s, i) => {
    const stageMovements = ordered.filter((m) => m.stage === s.key)
    const state: ProcessStep['state'] = i < currentIndex || (finished && i === currentIndex) ? 'done' : i === currentIndex ? 'current' : 'pending'
    return {
      stage: s.key,
      label: s.label,
      description: s.description,
      unit: s.unit,
      state,
      startedAt: stageMovements[0]?.at,
      responsible: stageMovements.at(-1)?.responsible,
      movements: stageMovements,
    }
  })

  const done = steps.filter((s) => s.state === 'done').length
  return { propositionId: proposition.id, steps, progress: steps.length ? done / steps.length : 0, currentStage: proposition.stage }
}

/** Etapas que não se aplicam ao tipo (ex.: Indicação não vai à comissão nem à sanção). */
export function isStageApplicable(stage: ProcessStage, type?: PropositionTypeConfig): boolean {
  if (!type) return true
  if (!type.requiresCommittee && (stage === 'committee' || stage === 'opinion')) return false
  if (!type.requiresVoting && (stage === 'voting' || stage === 'result' || stage === 'discussion')) return false
  if (!type.goesToSanction && (stage === 'sanction_veto' || stage === 'promulgation')) return false
  return true
}

/** Identificação: "PL 025/2026" */
export function propositionCode(p: Pick<Proposition, 'number' | 'year'>, type?: Pick<PropositionTypeConfig, 'code'>) {
  return `${type?.code ?? '—'} ${String(p.number).padStart(3, '0')}/${p.year}`
}

/** Identificação por extenso: "Projeto de Lei nº 025/2026" */
export function propositionTitle(p: Pick<Proposition, 'number' | 'year'>, type?: Pick<PropositionTypeConfig, 'name'>) {
  return `${type?.name ?? 'Proposição'} nº ${String(p.number).padStart(3, '0')}/${p.year}`
}

export function nextPropositionNumber(existing: Pick<Proposition, 'typeId' | 'year' | 'number'>[], typeId: string, year: number) {
  return existing.filter((p) => p.typeId === typeId && p.year === year).reduce((max, p) => Math.max(max, p.number), 0) + 1
}
