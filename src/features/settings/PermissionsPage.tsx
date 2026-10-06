import { useState } from 'react'
import { KeyRound, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Checkbox } from '@/components/ui/form-controls'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { PageHeader } from '@/components/common/page'
import { useAction, useDocument, usePermission } from '@/hooks/useData'
import { settingsService } from '@/services/settingsService'
import { ALL_ACTIONS, ALL_MODULES, DEFAULT_PERMISSIONS, ROLES } from '@/domain/auth/permissions'
import type { PermissionAction, PermissionMatrix, PermissionModule, RoleKey } from '@/types'

const ROLE_KEYS = Object.keys(ROLES) as RoleKey[]
/** O administrador nunca pode perder acesso à gestão de permissões e configurações (evita bloqueio do sistema). */
const LOCKED_ADMIN_MODULES: PermissionModule[] = ['permissions', 'settings']

function isLocked(role: RoleKey, module: PermissionModule) {
  return role === 'admin' && LOCKED_ADMIN_MODULES.includes(module)
}

function Matrix({ matrix, role, editable, onToggle }: { matrix: PermissionMatrix; role: RoleKey; editable: boolean; onToggle: (m: PermissionModule, a: PermissionAction, v: boolean) => void }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH className="sticky left-0 z-10 bg-muted">Módulo</TH>
          {ALL_ACTIONS.map((a) => (
            <TH key={a.key} className="text-center">
              {a.label}
            </TH>
          ))}
        </tr>
      </THead>
      <TBody>
        {ALL_MODULES.map((m) => {
          const granted = matrix[role]?.[m.key] ?? []
          const locked = isLocked(role, m.key)
          return (
            <TR key={m.key}>
              <TD className="sticky left-0 z-10 whitespace-nowrap bg-card font-medium">{m.label}</TD>
              {ALL_ACTIONS.map((a) => (
                <TD key={a.key} className="text-center">
                  <span className="inline-grid size-9 place-items-center">
                    <Checkbox
                      checked={granted.includes(a.key)}
                      disabled={!editable || locked}
                      onCheckedChange={(v) => onToggle(m.key, a.key, v === true)}
                      aria-label={`${ROLES[role].name}: ${a.label} em ${m.label}`}
                    />
                  </span>
                </TD>
              ))}
            </TR>
          )
        })}
      </TBody>
    </Table>
  )
}

export default function PermissionsPage() {
  const { data, isLoading } = useDocument('permissions')
  const can = usePermission()
  const editable = can('permissions', 'edit')
  const [draft, setDraft] = useState<PermissionMatrix | null>(null)
  const [role, setRole] = useState<RoleKey>('presidency')
  const [confirmReset, setConfirmReset] = useState(false)
  const save = useAction((m: PermissionMatrix) => settingsService.savePermissions(m), { success: 'Permissões salvas com sucesso.', onSuccess: () => setDraft(null) })

  if (isLoading) return <PageSkeleton />
  if (!data)
    return (
      <Card>
        <EmptyState icon={KeyRound} title="Matriz de permissões indisponível" />
      </Card>
    )

  const matrix = draft ?? data
  const dirty = draft !== null

  function toggle(module: PermissionModule, action: PermissionAction, value: boolean) {
    if (isLocked(role, module)) return
    const current = new Set(matrix[role]?.[module] ?? [])
    if (value) {
      current.add(action)
      current.add('view') // qualquer ação implica visualização
    } else {
      current.delete(action)
      if (action === 'view') current.clear()
    }
    const ordered = ALL_ACTIONS.map((a) => a.key).filter((a) => current.has(a))
    setDraft({ ...matrix, [role]: { ...matrix[role], [module]: ordered } })
  }

  const grantedCount = (r: RoleKey) => Object.values(matrix[r] ?? {}).reduce((s, a) => s + (a?.length ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Permissões"
        description="Matriz de acesso por perfil: visualizar, criar, editar, excluir, aprovar, operar e exportar."
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Gestão' }, { label: 'Permissões' }]}
        actions={
          editable && (
            <>
              <Button variant="outline" onClick={() => setConfirmReset(true)}>
                <RotateCcw /> Restaurar padrão
              </Button>
              {dirty && (
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Descartar
                </Button>
              )}
              <Button onClick={() => save.run(matrix)} disabled={!dirty} loading={save.pending}>
                <Save /> Salvar alterações
              </Button>
            </>
          )
        }
      />

      <Alert tone="warning" className="mb-5" title="Controle de acesso no navegador é apenas experiência de uso">
        Esta matriz define o que cada perfil visualiza na interface. Ela não substitui autorização no servidor: na fase de produção, cada permissão será reaplicada no backend por meio de policies de Row Level Security (RLS).
      </Alert>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ROLE_KEYS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            aria-pressed={role === r}
            className={`rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50 ${role === r ? 'border-primary ring-1 ring-primary' : ''}`}
          >
            <p className="text-sm font-semibold">{ROLES[r].name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular">{grantedCount(r)} permissões</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{ROLES[role].name}</CardTitle>
            <CardDescription>{ROLES[role].description}</CardDescription>
          </div>
          <Tabs value={role} onValueChange={(v) => setRole(v as RoleKey)} className="sm:hidden">
            <TabsList className="border-b-0">
              {ROLE_KEYS.map((r) => (
                <TabsTrigger key={r} value={r}>
                  {ROLES[r].name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <Matrix matrix={matrix} role={role} editable={editable} onToggle={toggle} />
        <CardContent className="border-t py-3 text-xs text-muted-foreground">
          {role === 'admin' ? 'O Administrador mantém sempre acesso total a Permissões e Configurações para evitar bloqueio do sistema. ' : ''}
          Marcar qualquer ação concede automaticamente “Visualizar”; desmarcar “Visualizar” remove todas as ações do módulo.
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        tone="warning"
        title="Restaurar permissões padrão?"
        description="A matriz de todos os perfis voltará à configuração padrão do sistema. A alteração é registrada na auditoria."
        confirmLabel="Restaurar padrão"
        onConfirm={async () => {
          await save.run(DEFAULT_PERMISSIONS)
        }}
      />
    </>
  )
}
