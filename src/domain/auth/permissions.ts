import type { PermissionAction, PermissionMatrix, PermissionModule, Role, RoleKey } from '@/types'

/**
 * RBAC frontend.
 * ATENÇÃO: controla apenas a EXPERIÊNCIA de navegação. Não é mecanismo de segurança.
 * Em produção, toda autorização deve ser revalidada no backend (RLS + policies no Supabase).
 */

export const ALL_MODULES: Array<{ key: PermissionModule; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'propositions', label: 'Proposições' },
  { key: 'processes', label: 'Processos / Tramitação' },
  { key: 'opinions', label: 'Pareceres' },
  { key: 'sessions', label: 'Sessões' },
  { key: 'attendance', label: 'Presença' },
  { key: 'agendas', label: 'Pautas' },
  { key: 'order_of_day', label: 'Ordem do Dia' },
  { key: 'voting', label: 'Votação' },
  { key: 'committees', label: 'Comissões' },
  { key: 'councilors', label: 'Vereadores' },
  { key: 'legislatures', label: 'Legislaturas' },
  { key: 'parties', label: 'Partidos' },
  { key: 'users', label: 'Usuários' },
  { key: 'permissions', label: 'Permissões' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'audit', label: 'Auditoria' },
  { key: 'notifications', label: 'Notificações' },
  { key: 'settings', label: 'Configurações' },
]

export const ALL_ACTIONS: Array<{ key: PermissionAction; label: string }> = [
  { key: 'view', label: 'Visualizar' },
  { key: 'create', label: 'Criar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
  { key: 'approve', label: 'Aprovar' },
  { key: 'operate', label: 'Operar' },
  { key: 'export', label: 'Exportar' },
]

export const ROLES: Record<RoleKey, Role> = {
  admin: { key: 'admin', name: 'Administrador', description: 'Acesso total, configurações, usuários e parâmetros.', home: '/admin/dashboard' },
  presidency: { key: 'presidency', name: 'Presidência', description: 'Sessões, pauta, Ordem do Dia e condução das votações.', home: '/presidencia/dashboard' },
  secretariat: { key: 'secretariat', name: 'Secretaria Legislativa', description: 'Proposições, processos, tramitação, pautas e atas.', home: '/admin/dashboard' },
  councilor: { key: 'councilor', name: 'Vereador', description: 'Matérias, sessões, votação e seus registros.', home: '/vereador/dashboard' },
  committee: { key: 'committee', name: 'Comissão', description: 'Matérias recebidas, pareceres e tramitação.', home: '/admin/pareceres' },
}

const ALL: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'operate', 'export']
const CRUD: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export']
const VIEW: PermissionAction[] = ['view']

export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  admin: Object.fromEntries(ALL_MODULES.map((m) => [m.key, ALL])) as PermissionMatrix['admin'],
  presidency: {
    dashboard: VIEW,
    propositions: ['view', 'export'],
    processes: ['view', 'approve'],
    opinions: VIEW,
    sessions: ['view', 'create', 'edit', 'operate', 'export'],
    attendance: ['view', 'operate'],
    agendas: ['view', 'create', 'edit', 'approve', 'export'],
    order_of_day: ['view', 'operate'],
    voting: ['view', 'operate', 'approve', 'export'],
    committees: VIEW,
    councilors: VIEW,
    reports: ['view', 'export'],
    notifications: VIEW,
  },
  secretariat: {
    dashboard: VIEW,
    propositions: CRUD,
    processes: ['view', 'create', 'edit', 'operate'],
    opinions: ['view', 'create', 'edit'],
    sessions: CRUD,
    attendance: ['view', 'operate'],
    agendas: CRUD,
    order_of_day: VIEW,
    voting: VIEW,
    committees: ['view', 'create', 'edit'],
    councilors: ['view', 'create', 'edit'],
    legislatures: ['view', 'create', 'edit'],
    parties: ['view', 'create', 'edit'],
    reports: ['view', 'export'],
    notifications: VIEW,
  },
  councilor: {
    propositions: VIEW,
    sessions: VIEW,
    voting: ['view', 'operate'],
    notifications: VIEW,
  },
  committee: {
    dashboard: VIEW,
    propositions: VIEW,
    processes: ['view', 'operate'],
    opinions: ['view', 'create', 'edit', 'approve'],
    committees: VIEW,
    notifications: VIEW,
  },
}

export function can(matrix: PermissionMatrix, role: RoleKey | undefined, module: PermissionModule, action: PermissionAction = 'view'): boolean {
  if (!role) return false
  return matrix[role]?.[module]?.includes(action) ?? false
}
