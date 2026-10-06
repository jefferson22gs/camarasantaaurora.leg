import type { Entity, ID } from './common'
import type { QuorumRule, QuorumType } from './quorum'
import type { VotingMethod } from './voting'
import type { ProcessStage } from './legislative'

export interface Organization extends Entity {
  /** "Câmara Municipal de Santa Aurora" */
  name: string
  shortName: string
  systemName: string
  city: string
  state: string
  cnpj: string
  address: string
  phone: string
  email: string
  website: string
  /** URL ou data URL (simulação de upload). */
  logoUrl?: string
  crestUrl?: string
  faviconUrl?: string
  primaryColor: string
  secondaryColor: string
  councilSeats: number
  currentLegislatureId: ID
  slug: string
}

export interface PropositionTypeConfig extends Entity {
  /** Sigla usada na numeração: PL, PLC, PDL… */
  code: string
  name: string
  requiresCommittee: boolean
  requiresVoting: boolean
  defaultQuorumRuleId: ID
  defaultVotingMethod: VotingMethod
  /** Quando aprovada, segue para sanção/veto do Executivo. */
  goesToSanction: boolean
  active: boolean
}

export interface ProcessStageConfig {
  key: ProcessStage
  label: string
  description: string
  enabled: boolean
  /** Unidade responsável padrão. */
  unit: string
}

export type PresidentVotingMode = 'normal' | 'never' | 'specific'

export interface PresidentRule {
  mode: PresidentVotingMode
  /** mode = specific: tipos de quórum em que o Presidente vota. */
  votesOnQuorumTypes: QuorumType[]
  /** mode = specific: Presidente vota em votações secretas. */
  votesOnSecret: boolean
  /** Presidente possui voto de desempate. */
  tiebreak: boolean
}

export type DeliberationQuorum = 'absolute_majority' | 'one_third' | 'none'

export interface VotingSettings {
  defaultDurationSeconds: number
  automaticClose: boolean
  allowAbstention: boolean
  /** Nomenclatura parametrizável das opções. */
  labels: { yes: string; no: string; abstention: string }
  /** Quórum mínimo de presença para deliberar. */
  deliberationQuorum: DeliberationQuorum
  /** Sem quórum: bloquear abertura ou apenas alertar. */
  withoutQuorumBehavior: 'block' | 'warn'
  allowReopen: boolean
  /** Resultado de empate quando não há desempate do Presidente. */
  tieOutcome: 'rejected' | 'tie'
}

export interface TransparencySettings {
  publishNominalVotes: boolean
  publishAttendance: boolean
  publishOpinions: boolean
  publishMinutes: boolean
}

export interface NotificationSettings {
  channels: { system: boolean; email: boolean; app: boolean; whatsapp: boolean }
}

export interface SecuritySettings {
  sessionTimeoutMinutes: number
  requireDeviceRegistration: boolean
  passwordMinLength: number
}

export interface DocumentSettings {
  minutesHeader: string
  minutesFooter: string
  agendaHeader: string
}

export interface OrganizationSettings {
  organizationId: ID
  voting: VotingSettings
  presidentRule: PresidentRule
  quorumRules: QuorumRule[]
  propositionTypes: PropositionTypeConfig[]
  processFlow: ProcessStageConfig[]
  transparency: TransparencySettings
  notifications: NotificationSettings
  security: SecuritySettings
  documents: DocumentSettings
  sessionDefaults: { location: string; startTime: string; durationMinutes: number }
  integrations: { portalUrl: string; webhookUrl: string }
}
