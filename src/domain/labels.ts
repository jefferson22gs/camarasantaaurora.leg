import type {
  AgendaItemStatus,
  AttendanceStatus,
  AuthorType,
  BoardRole,
  CommitteeKind,
  CouncilorStatus,
  LegislatureStatus,
  NotificationCategory,
  OpinionConclusion,
  OpinionStatus,
  ProcessingRegime,
  PropositionStatus,
  QuorumType,
  SessionStatus,
  SessionType,
  VoteChoice,
  VotingMethod,
  VotingStatus,
} from '@/types'

/**
 * Rótulos e tons centralizados para todos os status do sistema.
 * Nenhuma tela escreve strings de status por conta própria.
 */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary' | 'accent'

export interface StatusMeta {
  label: string
  tone: Tone
}

export const PropositionStatusMeta: Record<PropositionStatus, StatusMeta> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  filed: { label: 'Protocolada', tone: 'info' },
  in_analysis: { label: 'Em análise', tone: 'info' },
  in_committee: { label: 'Em comissão', tone: 'warning' },
  ready_for_agenda: { label: 'Apta para pauta', tone: 'primary' },
  on_agenda: { label: 'Em pauta', tone: 'primary' },
  in_voting: { label: 'Em votação', tone: 'accent' },
  approved: { label: 'Aprovada', tone: 'success' },
  rejected: { label: 'Rejeitada', tone: 'danger' },
  sanctioned: { label: 'Sancionada', tone: 'success' },
  vetoed: { label: 'Vetada', tone: 'danger' },
  promulgated: { label: 'Promulgada', tone: 'success' },
  archived: { label: 'Arquivada', tone: 'neutral' },
  withdrawn: { label: 'Retirada', tone: 'neutral' },
}

/** Agrupamento usado em indicadores do dashboard. */
export const IN_PROGRESS_STATUSES: PropositionStatus[] = ['filed', 'in_analysis', 'in_committee', 'ready_for_agenda', 'on_agenda', 'in_voting']
export const APPROVED_STATUSES: PropositionStatus[] = ['approved', 'sanctioned', 'promulgated']
export const REJECTED_STATUSES: PropositionStatus[] = ['rejected', 'vetoed']

export const SessionStatusMeta: Record<SessionStatus, StatusMeta> = {
  scheduled: { label: 'Agendada', tone: 'info' },
  open: { label: 'Aberta', tone: 'primary' },
  in_progress: { label: 'Em andamento', tone: 'accent' },
  suspended: { label: 'Suspensa', tone: 'warning' },
  closed: { label: 'Encerrada', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
}

export const SessionTypeLabel: Record<SessionType, string> = {
  ordinary: 'Ordinária',
  extraordinary: 'Extraordinária',
  solemn: 'Solene',
  special: 'Especial',
  public_hearing: 'Audiência Pública',
  other: 'Outra',
}

export const VotingStatusMeta: Record<VotingStatus, StatusMeta> = {
  idle: { label: 'Aguardando', tone: 'neutral' },
  preparing: { label: 'Preparando', tone: 'info' },
  open: { label: 'Votação aberta', tone: 'accent' },
  closed: { label: 'Encerrada', tone: 'success' },
  cancelled: { label: 'Anulada', tone: 'danger' },
}

export const VotingMethodLabel: Record<VotingMethod, string> = {
  nominal: 'Nominal',
  symbolic: 'Simbólica',
  secret: 'Secreta',
}

export const VoteChoiceMeta: Record<VoteChoice, StatusMeta> = {
  yes: { label: 'SIM', tone: 'success' },
  no: { label: 'NÃO', tone: 'danger' },
  abstention: { label: 'ABSTENÇÃO', tone: 'warning' },
}

export const OpinionStatusMeta: Record<OpinionStatus, StatusMeta> = {
  pending: { label: 'Pendente', tone: 'warning' },
  drafting: { label: 'Em elaboração', tone: 'info' },
  completed: { label: 'Concluído', tone: 'success' },
}

export const OpinionConclusionMeta: Record<OpinionConclusion, StatusMeta> = {
  favorable: { label: 'Favorável', tone: 'success' },
  contrary: { label: 'Contrário', tone: 'danger' },
  favorable_with_reservations: { label: 'Favorável com ressalvas', tone: 'warning' },
}

export const AttendanceStatusMeta: Record<AttendanceStatus, StatusMeta> = {
  pending: { label: 'Não registrado', tone: 'neutral' },
  present: { label: 'Presente', tone: 'success' },
  absent: { label: 'Ausente', tone: 'danger' },
  justified: { label: 'Ausência justificada', tone: 'warning' },
  impeded: { label: 'Impedido', tone: 'accent' },
}

export const AgendaItemStatusMeta: Record<AgendaItemStatus, StatusMeta> = {
  pending: { label: 'Aguardando', tone: 'neutral' },
  reading: { label: 'Em leitura', tone: 'info' },
  discussion: { label: 'Em discussão', tone: 'primary' },
  discussion_closed: { label: 'Discussão encerrada', tone: 'info' },
  voting: { label: 'Em votação', tone: 'accent' },
  voted: { label: 'Votado', tone: 'success' },
  postponed: { label: 'Adiado', tone: 'warning' },
  withdrawn: { label: 'Retirado de pauta', tone: 'neutral' },
}

export const LegislatureStatusMeta: Record<LegislatureStatus, StatusMeta> = {
  active: { label: 'Em curso', tone: 'success' },
  closed: { label: 'Encerrada', tone: 'neutral' },
  future: { label: 'Futura', tone: 'info' },
}

export const CouncilorStatusMeta: Record<CouncilorStatus, StatusMeta> = {
  active: { label: 'Em exercício', tone: 'success' },
  licensed: { label: 'Licenciado', tone: 'warning' },
  inactive: { label: 'Inativo', tone: 'neutral' },
}

export const BoardRoleLabel: Record<BoardRole, string> = {
  president: 'Presidente',
  vice_president: 'Vice-Presidente',
  first_secretary: '1º Secretário',
  second_secretary: '2º Secretário',
}

export const CommitteeKindLabel: Record<CommitteeKind, string> = {
  permanent: 'Permanente',
  temporary: 'Temporária',
}

export const AuthorTypeLabel: Record<AuthorType, string> = {
  councilor: 'Vereador(a)',
  executive: 'Poder Executivo',
  committee: 'Comissão',
  board: 'Mesa Diretora',
  popular: 'Iniciativa Popular',
}

export const RegimeLabel: Record<ProcessingRegime, string> = {
  ordinary: 'Ordinário',
  priority: 'Prioridade',
  urgent: 'Urgência',
  special: 'Especial',
}

export const QuorumTypeLabel: Record<QuorumType, string> = {
  simple_majority: 'Maioria simples',
  absolute_majority: 'Maioria absoluta',
  qualified_majority: 'Maioria qualificada',
  two_thirds: '2/3 (dois terços)',
  specific: 'Quórum específico',
  custom: 'Personalizado',
}

export const NotificationCategoryLabel: Record<NotificationCategory, string> = {
  system: 'Sistema',
  session: 'Sessões',
  proposition: 'Proposições',
  voting: 'Votações',
}
