import type { Entity } from './common'

export type QuorumType =
  | 'simple_majority'
  | 'absolute_majority'
  | 'qualified_majority'
  | 'two_thirds'
  | 'specific'
  | 'custom'

/**
 * Base sobre a qual o quórum de aprovação é calculado:
 * - votes_cast: votos válidos (SIM + NÃO [+ abstenções, se incluídas])
 * - present: vereadores presentes aptos
 * - eligible: vereadores aptos (em exercício, sem impedimento)
 * - members: composição total da Câmara
 */
export type QuorumBase = 'votes_cast' | 'present' | 'eligible' | 'members'

/** majority = mais da metade; fraction = ao menos numerator/denominator; fixed = número fixo de votos. */
export type QuorumThreshold = 'majority' | 'fraction' | 'fixed'

export interface QuorumRule extends Entity {
  name: string
  type: QuorumType
  base: QuorumBase
  threshold: QuorumThreshold
  numerator?: number
  denominator?: number
  fixedVotes?: number
  /** Abstenções compõem a base quando base = votes_cast. */
  abstentions: 'exclude' | 'include'
  description: string
}
