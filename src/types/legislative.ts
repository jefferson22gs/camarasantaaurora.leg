import type { DocumentRef, Entity, ID, ISODate, ISODateTime, Timestamped } from './common'
import type { VotingMethod } from './voting'

export type LegislatureStatus = 'active' | 'closed' | 'future'

export interface Legislature extends Entity {
  name: string
  number: number
  startDate: ISODate
  endDate: ISODate
  status: LegislatureStatus
  notes: string
}

export type PartyStatus = 'active' | 'inactive'

export interface Party extends Entity {
  acronym: string
  name: string
  number: number
  color: string
  logoUrl?: string
  status: PartyStatus
}

export type CouncilorStatus = 'active' | 'licensed' | 'inactive'
export type MandateType = 'holder' | 'substitute'
export type BoardRole = 'president' | 'vice_president' | 'first_secretary' | 'second_secretary'

export interface Councilor extends Entity {
  fullName: string
  parliamentaryName: string
  photoUrl?: string
  cpf?: string
  partyId: ID
  legislatureId: ID
  mandate: MandateType
  mandateStart: ISODate
  mandateEnd: ISODate
  email: string
  phone: string
  status: CouncilorStatus
  boardRole: BoardRole | null
  bio: string
}

export type CommitteeKind = 'permanent' | 'temporary'
export type CommitteeStatus = 'active' | 'closed'

export interface Committee extends Entity {
  name: string
  acronym: string
  kind: CommitteeKind
  startDate: ISODate
  endDate?: ISODate
  presidentId: ID
  vicePresidentId: ID
  memberIds: ID[]
  description: string
  status: CommitteeStatus
}

export type PropositionStatus =
  | 'draft'
  | 'filed'
  | 'in_analysis'
  | 'in_committee'
  | 'ready_for_agenda'
  | 'on_agenda'
  | 'in_voting'
  | 'approved'
  | 'rejected'
  | 'sanctioned'
  | 'vetoed'
  | 'promulgated'
  | 'archived'
  | 'withdrawn'

export type AuthorType = 'councilor' | 'executive' | 'committee' | 'board' | 'popular'
export type ProcessingRegime = 'ordinary' | 'priority' | 'urgent' | 'special'

export type ProcessStage =
  | 'proposition'
  | 'protocol'
  | 'analysis'
  | 'referral'
  | 'committee'
  | 'opinion'
  | 'agenda'
  | 'order_of_day'
  | 'discussion'
  | 'voting'
  | 'result'
  | 'sanction_veto'
  | 'promulgation'
  | 'publication'
  | 'archiving'

export interface Proposition extends Entity, Timestamped {
  typeId: ID
  number: number
  year: number
  /** Ementa */
  summary: string
  authorType: AuthorType
  authorId?: ID
  authorName: string
  coauthorIds: ID[]
  presentedAt: ISODate
  presentationSessionId?: ID
  subject: string
  fullText: string
  attachments: DocumentRef[]
  status: PropositionStatus
  stage: ProcessStage
  committeeIds: ID[]
  rapporteurId?: ID
  regime: ProcessingRegime
  votingMethod: VotingMethod
  quorumRuleId: ID
  notes: string
  /** Emendas/substitutivos referenciam a proposição principal. */
  parentId?: ID
  protocolNumber: string
}

export interface ProcessMovement extends Entity {
  propositionId: ID
  at: ISODateTime
  from: string
  to: string
  action: string
  stage: ProcessStage
  responsible: string
  notes: string
  documents: DocumentRef[]
}

export type ProcessStepState = 'done' | 'current' | 'pending'

export interface ProcessStep {
  stage: ProcessStage
  label: string
  description: string
  state: ProcessStepState
  unit: string
  startedAt?: ISODateTime
  responsible?: string
  movements: ProcessMovement[]
}

/** Visão derivada do processo legislativo (montada pelo domínio a partir das movimentações). */
export interface LegislativeProcess {
  propositionId: ID
  steps: ProcessStep[]
  progress: number
  currentStage: ProcessStage
}

export type OpinionStatus = 'pending' | 'drafting' | 'completed'
export type OpinionConclusion = 'favorable' | 'contrary' | 'favorable_with_reservations'

export interface Opinion extends Entity, Timestamped {
  propositionId: ID
  committeeId: ID
  rapporteurId: ID
  dueDate: ISODate
  issuedAt?: ISODate
  report: string
  reasoning: string
  conclusion: OpinionConclusion | null
  status: OpinionStatus
  attachments: DocumentRef[]
}
