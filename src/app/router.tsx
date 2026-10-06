import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/domain/auth/permissions'
import type { PermissionModule, RoleKey } from '@/types'
import { NotFoundPage, RouteErrorPage } from './ErrorPages'

/* Code splitting por página. */
const page = (loader: () => Promise<{ default: ComponentType }>) => {
  const C = lazy(loader)
  return <C />
}
const guard = (el: ReactNode, opts: { module?: PermissionModule; roles?: RoleKey[] } = {}) => <ProtectedRoute {...opts}>{el}</ProtectedRoute>

const STAFF: RoleKey[] = ['admin', 'secretariat', 'committee', 'presidency']

function HomeRedirect() {
  const user = useAuthStore((s) => s.user)
  return <Navigate to={user ? ROLES[user.role].home : '/transparencia'} replace />
}

const Fullscreen = () => (
  <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-sidebar text-white/70">Carregando…</div>}>
    <Outlet />
  </Suspense>
)

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomeRedirect /> },
      { path: '/login', element: <Suspense fallback={null}>{page(() => import('@/features/auth/LoginPage'))}</Suspense> },

      /* ---------- Portal Administrativo ---------- */
      {
        path: '/admin',
        element: guard(<AppShell area="admin" />, { roles: STAFF }),
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: guard(page(() => import('@/features/dashboard/DashboardPage')), { module: 'dashboard' }) },
          { path: 'proposicoes', element: guard(page(() => import('@/features/propositions/PropositionsPage')), { module: 'propositions' }) },
          { path: 'proposicoes/nova', element: guard(page(() => import('@/features/propositions/PropositionFormPage')), { module: 'propositions' }) },
          { path: 'proposicoes/:id', element: guard(page(() => import('@/features/propositions/PropositionDetailPage')), { module: 'propositions' }) },
          { path: 'proposicoes/:id/editar', element: guard(page(() => import('@/features/propositions/PropositionFormPage')), { module: 'propositions' }) },
          { path: 'processos', element: guard(page(() => import('@/features/legislative-process/ProcessesPage')), { module: 'processes' }) },
          { path: 'pareceres', element: guard(page(() => import('@/features/legislative-process/OpinionsPage')), { module: 'opinions' }) },
          { path: 'sessoes', element: guard(page(() => import('@/features/sessions/SessionsPage')), { module: 'sessions' }) },
          { path: 'sessoes/:id', element: guard(page(() => import('@/features/sessions/SessionDetailPage')), { module: 'sessions' }) },
          { path: 'sessoes/:id/ata', element: guard(page(() => import('@/features/sessions/MinutesPage')), { module: 'sessions' }) },
          { path: 'pautas', element: guard(page(() => import('@/features/agendas/AgendasPage')), { module: 'agendas' }) },
          { path: 'ordem-do-dia', element: guard(page(() => import('@/features/voting/OrderOfDayPage')), { module: 'order_of_day' }) },
          { path: 'comissoes', element: guard(page(() => import('@/features/committees/CommitteesPage')), { module: 'committees' }) },
          { path: 'comissoes/:id', element: guard(page(() => import('@/features/committees/CommitteeDetailPage')), { module: 'committees' }) },
          { path: 'vereadores', element: guard(page(() => import('@/features/legislators/LegislatorsPage')), { module: 'councilors' }) },
          { path: 'vereadores/:id', element: guard(page(() => import('@/features/legislators/LegislatorDetailPage')), { module: 'councilors' }) },
          { path: 'legislaturas', element: guard(page(() => import('@/features/legislators/LegislaturesPage')), { module: 'legislatures' }) },
          { path: 'partidos', element: guard(page(() => import('@/features/parties/PartiesPage')), { module: 'parties' }) },
          { path: 'usuarios', element: guard(page(() => import('@/features/settings/UsersPage')), { module: 'users' }) },
          { path: 'permissoes', element: guard(page(() => import('@/features/settings/PermissionsPage')), { module: 'permissions' }) },
          { path: 'relatorios', element: guard(page(() => import('@/features/reports/ReportsPage')), { module: 'reports' }) },
          { path: 'auditoria', element: guard(page(() => import('@/features/audit/AuditPage')), { module: 'audit' }) },
          { path: 'notificacoes', element: guard(page(() => import('@/features/notifications/NotificationsPage')), { module: 'notifications' }) },
          { path: 'configuracoes', element: guard(page(() => import('@/features/settings/SettingsPage')), { module: 'settings' }) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },

      /* ---------- Presidência ---------- */
      {
        path: '/presidencia',
        element: guard(<AppShell area="presidencia" />, { roles: ['presidency', 'admin'] }),
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: page(() => import('@/features/voting/PresidencyDashboardPage')) },
          { path: 'sessoes', element: guard(page(() => import('@/features/sessions/SessionsPage')), { module: 'sessions' }) },
          { path: 'sessoes/:id', element: guard(page(() => import('@/features/sessions/SessionDetailPage')), { module: 'sessions' }) },
          { path: 'sessoes/:id/ata', element: guard(page(() => import('@/features/sessions/MinutesPage')), { module: 'sessions' }) },
          { path: 'pauta', element: guard(page(() => import('@/features/agendas/AgendasPage')), { module: 'agendas' }) },
          { path: 'ordem-do-dia', element: guard(page(() => import('@/features/voting/OrderOfDayPage')), { module: 'order_of_day' }) },
          { path: 'votacao', element: guard(page(() => import('@/features/voting/OrderOfDayPage')), { module: 'voting' }) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },

      /* ---------- Portal do Vereador ---------- */
      {
        path: '/vereador',
        element: guard(<AppShell area="vereador" />, { roles: ['councilor'] }),
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: page(() => import('@/features/voting/CouncilorHomePage')) },
          { path: 'votacao', element: page(() => import('@/features/voting/CouncilorVotingPage')) },
          { path: 'materias', element: page(() => import('@/features/propositions/PropositionsPage')) },
          { path: 'materias/:id', element: page(() => import('@/features/propositions/PropositionDetailPage')) },
          { path: 'sessoes', element: page(() => import('@/features/sessions/SessionsPage')) },
          { path: 'sessoes/:id', element: page(() => import('@/features/sessions/SessionDetailPage')) },
          { path: 'sessoes/:id/ata', element: page(() => import('@/features/sessions/MinutesPage')) },
          { path: 'historico', element: page(() => import('@/features/voting/CouncilorHistoryPage')) },
          { path: 'perfil', element: page(() => import('@/features/legislators/CouncilorProfilePage')) },
          { path: 'notificacoes', element: page(() => import('@/features/notifications/NotificationsPage')) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },

      /* ---------- Painel do Plenário (telão, sem autenticação) ---------- */
      {
        path: '/plenario',
        element: <Fullscreen />,
        children: [
          { index: true, element: page(() => import('@/features/voting/PlenaryPanelPage')) },
          { path: 'sessao', element: page(() => import('@/features/voting/PlenaryPanelPage')) },
          { path: 'votacao', element: page(() => import('@/features/voting/PlenaryPanelPage')) },
          { path: 'resultado', element: page(() => import('@/features/voting/PlenaryPanelPage')) },
        ],
      },

      /* ---------- Portal da Transparência (público) ---------- */
      {
        path: '/transparencia',
        element: page(() => import('@/features/transparency/TransparencyLayout')),
        children: [
          { index: true, element: page(() => import('@/features/transparency/TransparencyHomePage')) },
          { path: 'proposicoes', element: page(() => import('@/features/transparency/PublicPropositionsPage')) },
          { path: 'proposicoes/:id', element: page(() => import('@/features/transparency/PublicPropositionDetailPage')) },
          { path: 'sessoes', element: page(() => import('@/features/transparency/PublicSessionsPage')) },
          { path: 'sessoes/:id', element: page(() => import('@/features/transparency/PublicSessionDetailPage')) },
          { path: 'votacoes', element: page(() => import('@/features/transparency/PublicVotingsPage')) },
          { path: 'votacoes/:id', element: page(() => import('@/features/transparency/PublicVotingDetailPage')) },
          { path: 'atas', element: page(() => import('@/features/transparency/PublicMinutesPage')) },
          { path: 'pautas', element: page(() => import('@/features/transparency/PublicAgendasPage')) },
          { path: 'pareceres', element: page(() => import('@/features/transparency/PublicOpinionsPage')) },
          { path: 'vereadores', element: page(() => import('@/features/transparency/PublicCouncilorsPage')) },
          { path: 'vereadores/:id', element: page(() => import('@/features/transparency/PublicCouncilorDetailPage')) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
