import type { DeliberationQuorum, QuorumBase, QuorumRule, VoteTally } from '@/types'

/**
 * QuorumEngine — funções puras para cálculo de quórum.
 * Nenhuma tela calcula quórum por conta própria: tudo passa por aqui.
 * Na fase 2, o mesmo cálculo deve ser replicado no backend (fonte da verdade).
 */

export const QUORUM_BASE_LABEL: Record<QuorumBase, string> = {
  votes_cast: 'votos válidos',
  present: 'presentes aptos',
  eligible: 'membros aptos',
  members: 'membros da Câmara',
}

/** Valor da base de cálculo conforme a regra. */
export function getQuorumBaseValue(rule: QuorumRule, tally: VoteTally): number {
  switch (rule.base) {
    case 'votes_cast':
      return tally.yes + tally.no + (rule.abstentions === 'include' ? tally.abstention : 0)
    case 'present':
      return tally.eligible
    case 'eligible':
      return Math.max(0, tally.members - tally.impeded)
    case 'members':
      return tally.members
  }
}

/** Quantidade mínima de votos SIM para aprovação sobre uma base. */
export function getRequiredVotes(rule: QuorumRule, baseValue: number): number {
  if (baseValue <= 0 && rule.threshold !== 'fixed') return 1
  switch (rule.threshold) {
    case 'majority':
      return Math.floor(baseValue / 2) + 1
    case 'fraction': {
      const num = rule.numerator ?? 1
      const den = rule.denominator ?? 2
      // Tolerância evita erro de ponto flutuante (ex.: 12 * 2/3 = 7.999…).
      return Math.max(1, Math.ceil((baseValue * num) / den - 1e-9))
    }
    case 'fixed':
      return Math.max(1, rule.fixedVotes ?? 1)
  }
}

/** Atalho: base + votos necessários. */
export function calculateQuorum(rule: QuorumRule, tally: VoteTally) {
  const baseValue = getQuorumBaseValue(rule, tally)
  return { base: rule.base, baseValue, requiredVotes: getRequiredVotes(rule, baseValue) }
}

/** Presença mínima para deliberar (quórum de instalação/deliberação). */
export function getDeliberationQuorum(members: number, kind: DeliberationQuorum): number {
  switch (kind) {
    case 'absolute_majority':
      return Math.floor(members / 2) + 1
    case 'one_third':
      return Math.ceil(members / 3)
    case 'none':
      return 0
  }
}

export function hasQuorum(present: number, members: number, kind: DeliberationQuorum): boolean {
  return present >= getDeliberationQuorum(members, kind)
}

/** Descrição legível de uma regra ("Maioria absoluta — mais da metade dos membros da Câmara"). */
export function describeQuorumRule(rule: QuorumRule): string {
  const base = QUORUM_BASE_LABEL[rule.base]
  switch (rule.threshold) {
    case 'majority':
      return `Mais da metade dos ${base}`
    case 'fraction':
      return `Ao menos ${rule.numerator}/${rule.denominator} dos ${base}`
    case 'fixed':
      return `${rule.fixedVotes} votos favoráveis`
  }
}
