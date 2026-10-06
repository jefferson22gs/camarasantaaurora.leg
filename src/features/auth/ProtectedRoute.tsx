import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/common/states'
import { useDocument } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { can, ROLES } from '@/domain/auth/permissions'
import type { PermissionAction, PermissionModule, RoleKey } from '@/types'

/**
 * Guarda de rota (RBAC frontend).
 * ATENÇÃO: protege apenas a navegação. A autorização real será feita no backend (RLS/policies).
 */
export function ProtectedRoute({ children, roles, module, action = 'view' }: { children: ReactNode; roles?: RoleKey[]; module?: PermissionModule; action?: PermissionAction }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const { data: matrix, isLoading } = useDocument('permissions')

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (module && isLoading) return <PageSkeleton />
  const roleOk = !roles || roles.includes(user.role)
  const moduleOk = !module || (matrix ? can(matrix, user.role, module, action) : false)
  if (!roleOk || !moduleOk) return <AccessDenied home={ROLES[user.role].home} />
  return <>{children}</>
}

export function AccessDenied({ home }: { home: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-warning-soft text-warning">
        <ShieldAlert className="size-7" aria-hidden />
      </div>
      <h1 className="text-xl font-bold">Acesso não autorizado</h1>
      <p className="mt-2 text-sm text-muted-foreground">Seu perfil não possui permissão para acessar esta área. Solicite acesso ao administrador do sistema.</p>
      <Button asChild className="mt-6">
        <Link to={home}>Voltar ao início</Link>
      </Button>
    </div>
  )
}
