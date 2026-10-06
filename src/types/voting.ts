import type { Entity, ID, ISODateTime } from './common'
import type { QuorumBase, QuorumRule } from './quorum'

export type VotingMethod = 'nominal' | 'symbolic' | 'secret'
export type VotingStatus = 'idle' | 'preparing' | 'open' | 'closed' | 'cancelled'
export type VoteChoice = 'yes' | 'no' | 'abstention'
export type VotingOutcome = 'approved' | 'rejected' | 'tie' | 'no_quorum'

export interface VoteTally {
  yes: number
  no: number
  abstention: number
  notVoted: number
  present: number
  eligible: number
  impeded: number
  absent: number
  members: number
}

export interface VotingResult extends VoteTally {
  outcome: VotingOutcome
  requiredVotes: number
  base: QuorumBase
  baseValue: number
  tieBrokenByPresident: boolean
  explanation: string
  computedAt: ISODateTime
}

export interface Voting extends Entity {
  sessionId: ID
  agendaItemId: ID
  propositionId: ID
  method: VotingMethod
  /** Snapshot da regra no momento da abertura (rastreabilidade). */
  quorumRule: QuorumRule
  status: VotingStatus
  round: number
  durationSeconds: number
  automaticClose: boolean
  openedAt?: ISODateTime
  closesAt?: ISODateTime
  closedAt?: ISODateTime
  openedBy?: string
  closedBy?: string
  cancelReason?: string
  /** Snapshot na abertura: membros, presentes aptos e impedidos. */
  memberIds: ID[]
  eligibleIds: ID[]
  presentIds: ID[]
  impededIds: ID[]
  presidentId: ID
  /** Quem já votou — impede voto duplicado (inclusive na secreta). */
  participantIds: ID[]
  symbolicTally?: { yes: number; no: number; abstention: number }
  tiebreakVote?: VoteChoice
  result?: VotingResult
}

export interface Vote extends Entity {
  /** Identificador do voto: VOT-2026-000125 */
  code: string
  votingId: ID
  sessionId: ID
  propositionId: ID
  /** null em votação secreta — a interface não associa vereador e voto. */
  councilorId: ID | null
  choice: VoteChoice
  castAt: ISODateTime
  device: string
}
