import type { ComponentType } from 'react'
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  FileText,
  Flag,
  Gavel,
  History,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Monitor,
  ScrollText,
  Settings,
  User,
  UserCog,
  Users,
  Vote,
  Workflow,
} from 'lucide-react'
import type { PermissionModule } from '@/types'

export type AppArea = 'admin' | 'presidencia' | 'vereador'

export interface NavItem {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
  module?: PermissionModule
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Navegação por área. A visibilidade de cada item é filtrada pelo RBAC. */
export const NAVIGATION: Record<AppArea, NavGroup[]> = {
  admin: [
    { label: 'Visão geral', items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, module: 'dashboard' }] },
    {
      label: 'Processo legislativo',
      items: [
        { label: 'Proposições', to: '/admin/proposicoes', icon: FileText, module: 'propositions' },
        { label: 'Processos', to: '/admin/processos', icon: Workflow, module: 'processes' },
        { label: 'Pareceres', to: '/admin/pareceres', icon: FileCheck2, module: 'opinions' },
        { label: 'Comissões', to: '/admin/comissoes', icon: Users, module: 'committees' },
      ],
    },
    {
      label: 'Plenário',
      items: [
        { label: 'Sessões', to: '/admin/sessoes', icon: CalendarDays, module: 'sessions' },
        { label: 'Pautas', to: '/admin/pautas', icon: ClipboardList, module: 'agendas' },
        { label: 'Ordem do Dia', to: '/admin/ordem-do-dia', icon: Gavel, module: 'order_of_day' },
      ],
    },
    {
      label: 'Cadastros',
      items: [
        { label: 'Vereadores', to: '/admin/vereadores', icon: Landmark, module: 'councilors' },
        { label: 'Legislaturas', to: '/admin/legislaturas', icon: BookOpen, module: 'legislatures' },
        { label: 'Partidos', to: '/admin/partidos', icon: Flag, module: 'parties' },
      ],
    },
    {
      label: 'Gestão',
      items: [
        { label: 'Relatórios', to: '/admin/relatorios', icon: BarChart3, module: 'reports' },
        { label: 'Auditoria', to: '/admin/auditoria', icon: History, module: 'audit' },
        { label: 'Notificações', to: '/admin/notificacoes', icon: Bell, module: 'notifications' },
        { label: 'Usuários', to: '/admin/usuarios', icon: UserCog, module: 'users' },
        { label: 'Permissões', to: '/admin/permissoes', icon: KeyRound, module: 'permissions' },
        { label: 'Configurações', to: '/admin/configuracoes', icon: Settings, module: 'settings' },
      ],
    },
  ],
  presidencia: [
    {
      label: 'Presidência',
      items: [
        { label: 'Painel', to: '/presidencia/dashboard', icon: LayoutDashboard },
        { label: 'Sessões', to: '/presidencia/sessoes', icon: CalendarDays, module: 'sessions' },
        { label: 'Pauta', to: '/presidencia/pauta', icon: ClipboardList, module: 'agendas' },
        { label: 'Ordem do Dia', to: '/presidencia/ordem-do-dia', icon: Gavel, module: 'order_of_day' },
        { label: 'Votação', to: '/presidencia/votacao', icon: Vote, module: 'voting' },
      ],
    },
    {
      label: 'Consulta',
      items: [
        { label: 'Proposições', to: '/admin/proposicoes', icon: FileText, module: 'propositions' },
        { label: 'Relatórios', to: '/admin/relatorios', icon: BarChart3, module: 'reports' },
        { label: 'Notificações', to: '/admin/notificacoes', icon: Bell, module: 'notifications' },
        { label: 'Painel do Plenário', to: '/plenario', icon: Monitor },
      ],
    },
  ],
  vereador: [
    {
      label: 'Vereador',
      items: [
        { label: 'Início', to: '/vereador/dashboard', icon: LayoutDashboard },
        { label: 'Votação', to: '/vereador/votacao', icon: Vote, module: 'voting' },
        { label: 'Matérias', to: '/vereador/materias', icon: FileText, module: 'propositions' },
        { label: 'Sessões', to: '/vereador/sessoes', icon: CalendarDays, module: 'sessions' },
        { label: 'Meu histórico', to: '/vereador/historico', icon: ScrollText },
        { label: 'Meu perfil', to: '/vereador/perfil', icon: User },
      ],
    },
  ],
}

export const AREA_LABEL: Record<AppArea, string> = {
  admin: 'Portal Administrativo',
  presidencia: 'Presidência',
  vereador: 'Portal do Vereador',
}

/** Área padrão de cada perfil. */
export const ROLE_AREA = { admin: 'admin', secretariat: 'admin', committee: 'admin', presidency: 'presidencia', councilor: 'vereador' } as const
