import type {
  Agenda,
  Attendance,
  AuditLog,
  Committee,
  Councilor,
  Entity,
  ID,
  Impediment,
  Legislature,
  Notification,
  Opinion,
  Organization,
  OrganizationSettings,
  Party,
  PermissionMatrix,
  ProcessMovement,
  Proposition,
  Session,
  User,
  Vote,
  Voting,
} from '@/types'

/**
 * Contratos da camada de persistência.
 * Fase 1: LocalCollectionRepository (localStorage + seeds).
 * Fase 2: SupabaseCollectionRepository implementando a MESMA interface.
 */
export interface CollectionRepository<T extends Entity> {
  list(): Promise<T[]>
  get(id: ID): Promise<T | null>
  create(item: T): Promise<T>
  update(id: ID, patch: Partial<T>): Promise<T>
  remove(id: ID): Promise<void>
  /** Escrita em lote (ex.: presença, reordenação de pauta). */
  upsertMany(items: T[]): Promise<void>
}

export interface DocumentRepository<T> {
  get(): Promise<T>
  save(value: T): Promise<T>
}

/** Mapa de coleções do sistema → tipo da entidade. */
export interface CollectionMap {
  legislatures: Legislature
  parties: Party
  councilors: Councilor
  committees: Committee
  users: User
  propositions: Proposition
  movements: ProcessMovement
  opinions: Opinion
  sessions: Session
  attendance: Attendance
  agendas: Agenda
  impediments: Impediment
  votings: Voting
  votes: Vote
  notifications: Notification
  auditLogs: AuditLog
}

export type CollectionName = keyof CollectionMap

export interface DocumentMap {
  organization: Organization
  settings: OrganizationSettings
  permissions: PermissionMatrix
}

export type DocumentName = keyof DocumentMap

export interface DataSource {
  collection<K extends CollectionName>(name: K): CollectionRepository<CollectionMap[K]>
  document<K extends DocumentName>(name: K): DocumentRepository<DocumentMap[K]>
  /** Restaura o dataset de demonstração (somente fonte mock). */
  reset(): Promise<void>
  /** Gera o próximo número de sequência (ex.: identificador de voto). */
  nextSequence(name: string): Promise<number>
}
