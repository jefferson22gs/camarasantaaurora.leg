import type { Entity, ID, ISODateTime } from './common'

export type RoleKey = 'admin' | 'presidency' | 'secretariat' | 'councilor' | 'committee'

export type PermissionModule =
  | 'dashboard'
  | 'propositions'
  | 'processes'
  | 'opinions'
  | 'sessions'
  | 'attendance'
  | 'agendas'
  | 'order_of_day'
  | 'voting'
  | 'committees'
  | 'councilors'
  | 'legislatures'
  | 'parties'
  | 'users'
  | 'permissions'
  | 'reports'
  | 'audit'
  | 'notifications'
  | 'settings'

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'operate' | 'export'

export interface Permission {
  module: PermissionModule
  action: PermissionAction
}

export type PermissionMatrix = Record<RoleKey, Partial<Record<PermissionModule, PermissionAction[]>>>

export interface Role {
  key: RoleKey
  name: string
  description: string
  /** Área inicial após login. */
  home: string
}

export interface User extends Entity {
  name: string
  email: string
  role: RoleKey
  councilorId?: ID
  committeeId?: ID
  active: boolean
  lastAccessAt?: ISODateTime
  createdAt: ISODateTime
}

export type NotificationCategory = 'system' | 'session' | 'proposition' | 'voting'

export interface Notification extends Entity {
  title: string
  message: string
  category: NotificationCategory
  createdAt: ISODateTime
  link?: string
  /** Vazio = todos os perfis. */
  targetRoles: RoleKey[]
  readBy: ID[]
}

export type AuditOrigin = 'web' | 'tablet' | 'panel' | 'system'

export interface AuditLog extends Entity {
  at: ISODateTime
  userId: ID
  userName: string
  role: RoleKey | 'system'
  operation: string
  module: PermissionModule | 'auth' | 'system'
  recordId?: ID
  recordLabel: string
  origin: AuditOrigin
  details: string
  before?: string
  after?: string
  device: string
  ip: string
  notes?: string
}
