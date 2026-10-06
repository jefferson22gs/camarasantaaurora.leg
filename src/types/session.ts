import type { Entity, ID, ISODate, ISODateTime } from './common'
import type { VotingMethod } from './voting'

export type SessionType = 'ordinary' | 'extraordinary' | 'solemn' | 'special' | 'public_hearing' | 'other'
export type SessionStatus = 'scheduled' | 'open' | 'in_progress' | 'suspended' | 'closed' | 'cancelled'

export interface Session extends Entity {
  type: SessionType
  number: number
  year: number
  date: ISODate
  startTime: string
  endTime?: string
  legislatureId: ID
  presidentId: ID
  location: string
  status: SessionStatus
  expedient: string
  notes: string
  openedAt?: ISODateTime
  closedAt?: ISODateTime
  currentAgendaItemId?: ID
}

export type AttendanceStatus = 'pending' | 'present' | 'absent' | 'justified' | 'impeded'

export interface Attendance extends Entity {
  sessionId: ID
  councilorId: ID
  status: AttendanceStatus
  registeredAt?: ISODateTime
  registeredBy?: string
  justification?: string
}

export type AgendaItemStatus =
  | 'pending'
  | 'reading'
  | 'discussion'
  | 'discussion_closed'
  | 'voting'
  | 'voted'
  | 'postponed'
  | 'withdrawn'

export type AgendaSection = 'expedient' | 'order_of_day'

export interface AgendaItem extends Entity {
  order: number
  propositionId: ID
  section: AgendaSection
  status: AgendaItemStatus
  votingMethod: VotingMethod
  quorumRuleId: ID
  notes: string
  discussionStartedAt?: ISODateTime
  discussionEndedAt?: ISODateTime
}

export type AgendaStatus = 'draft' | 'published'

export interface Agenda extends Entity {
  sessionId: ID
  status: AgendaStatus
  publishedAt?: ISODateTime
  items: AgendaItem[]
}

export interface Impediment extends Entity {
  councilorId: ID
  propositionId: ID
  kind: 'impediment' | 'suspicion'
  reason: string
  registeredBy: string
  registeredAt: ISODateTime
  documentName?: string
}
