import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Avatar, Badge, Card, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Field, Input, NativeSelect, Switch } from '@/components/ui/form-controls'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, QueryState } from '@/components/common/states'
import { PageHeader, Pagination, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { useAction, useCollection, usePermission } from '@/hooks/useData'
import { userService } from '@/services/registryServices'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/domain/auth/permissions'
import { formatDateTimeShort } from '@/lib/format'
import { matches, uid } from '@/lib/utils'
import type { RoleKey, User } from '@/types'

const ROLE_KEYS = Object.keys(ROLES) as RoleKey[]
const ACTIVE_META = { true: { label: 'Ativo', tone: 'success' as const }, false: { label: 'Inativo', tone: 'neutral' as const } }

const schema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome.'),
    email: z.string().trim().toLowerCase().email('E-mail inválido.'),
    role: z.enum(['admin', 'presidency', 'secretariat', 'councilor', 'committee']),
    councilorId: z.string().optional(),
    committeeId: z.string().optional(),
    active: z.boolean(),
  })
  .refine((v) => v.role !== 'councilor' || !!v.councilorId, { path: ['councilorId'], message: 'Vincule o usuário a um vereador.' })
  .refine((v) => v.role !== 'committee' || !!v.committeeId, { path: ['committeeId'], message: 'Vincule o usuário a uma comissão.' })

type FormValues = z.infer<typeof schema>

function UserForm({ initial, all, onDone }: { initial?: User; all: User[]; onDone: () => void }) {
  const councilors = useCollection('councilors')
  const committees = useCollection('committees')
  const self = useAuthStore((s) => s.user)
  const { register, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? '', email: initial?.email ?? '', role: initial?.role ?? 'secretariat', councilorId: initial?.councilorId ?? '', committeeId: initial?.committeeId ?? '', active: initial?.active ?? true },
  })
  const e = formState.errors
  const role = watch('role')
  const save = useAction(
    async (v: FormValues) => {
      if (all.some((u) => u.id !== initial?.id && u.email === v.email)) throw new Error('Já existe usuário com este e-mail.')
      if (v.role === 'councilor' && all.some((u) => u.id !== initial?.id && u.councilorId === v.councilorId)) throw new Error('Este vereador já possui usuário vinculado.')
      if (initial && initial.id === self?.id && (!v.active || v.role !== initial.role)) throw new Error('Você não pode alterar o perfil nem inativar o próprio usuário.')
      const data = { ...v, councilorId: v.role === 'councilor' ? v.councilorId : undefined, committeeId: v.role === 'committee' ? v.committeeId : undefined }
      return initial ? userService.update(initial.id, data) : userService.create({ id: uid('usr'), createdAt: new Date().toISOString(), ...data })
    },
    { success: initial ? 'Usuário atualizado.' : 'Usuário cadastrado com sucesso.', onSuccess: onDone },
  )
  return (
    <form onSubmit={handleSubmit((v) => save.run(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Nome" required error={e.name?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.name || undefined} {...register('name')} />}
      </Field>
      <Field label="E-mail" required error={e.email?.message}>
        {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!e.email || undefined} {...register('email')} />}
      </Field>
      <Field label="Perfil" required hint={ROLES[role].description}>
        {(id, d) => (
          <NativeSelect id={id} aria-describedby={d} {...register('role')}>
            {ROLE_KEYS.map((r) => (
              <option key={r} value={r}>
                {ROLES[r].name}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      {role === 'councilor' && (
        <Field label="Vereador vinculado" required error={e.councilorId?.message}>
          {(id, d) => (
            <NativeSelect id={id} aria-describedby={d} aria-invalid={!!e.councilorId || undefined} {...register('councilorId')}>
              <option value="">Selecione…</option>
              {(councilors.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parliamentaryName}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      {role === 'committee' && (
        <Field label="Comissão vinculada" required error={e.committeeId?.message}>
          {(id, d) => (
            <NativeSelect id={id} aria-describedby={d} aria-invalid={!!e.committeeId || undefined} {...register('committeeId')}>
              <option value="">Selecione…</option>
              {(committees.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym} — {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Switch id="user-active" checked={watch('active')} onCheckedChange={(v) => setValue('active', v)} />
        <label htmlFor="user-active" className="text-sm font-medium">
          Usuário ativo
        </label>
      </div>
      {!initial && (
        <Alert tone="info" className="text-xs sm:col-span-2">
          Nesta fase não há envio de convite nem definição de senha. Na fase 2, o convite será enviado pelo Supabase Auth.
        </Alert>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          {initial ? 'Salvar alterações' : 'Cadastrar usuário'}
        </Button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const query = useCollection('users')
  const councilors = useCollection('councilors')
  const committees = useCollection('committees')
  const can = usePermission()
  const self = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [form, setForm] = useState<{ item?: User } | null>(null)
  const [removing, setRemoving] = useState<User | null>(null)
  const remove = useAction((id: string) => userService.remove(id), { success: 'Usuário excluído.' })

  const filtered = useMemo(
    () => (query.data ?? []).filter((u) => (!role || u.role === role) && matches([u.name, u.email, ROLES[u.role].name], search)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [query.data, role, search],
  )
  const pg = usePagination(filtered, 10)
  const link = (u: User) =>
    u.councilorId ? councilors.data?.find((c) => c.id === u.councilorId)?.parliamentaryName : u.committeeId ? committees.data?.find((c) => c.id === u.committeeId)?.acronym : undefined

  const actions = (u: User) => (
    <div className="flex justify-end gap-1">
      {can('users', 'edit') && (
        <Button variant="ghost" size="icon-sm" onClick={() => setForm({ item: u })} aria-label={`Editar ${u.name}`}>
          <Pencil />
        </Button>
      )}
      {can('users', 'delete') && u.id !== self?.id && (
        <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(u)} aria-label={`Excluir ${u.name}`}>
          <Trash2 className="text-danger" />
        </Button>
      )}
    </div>
  )

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Contas de acesso, perfis e vínculos com vereadores e comissões."
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Gestão' }, { label: 'Usuários' }]}
        actions={
          can('users', 'create') && (
            <Button onClick={() => setForm({})}>
              <Plus /> Novo usuário
            </Button>
          )
        }
      />
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail" />
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value)} className="w-full sm:w-52" aria-label="Filtrar por perfil">
            <option value="">Todos os perfis</option>
            {ROLE_KEYS.map((r) => (
              <option key={r} value={r}>
                {ROLES[r].name}
              </option>
            ))}
          </NativeSelect>
        </Toolbar>
        <QueryState query={query} isEmpty={() => filtered.length === 0} empty={<EmptyState icon={UserCog} title="Nenhum usuário encontrado" />}>
          {() => (
            <>
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <tr>
                      <TH>Usuário</TH>
                      <TH>Perfil</TH>
                      <TH>Vínculo</TH>
                      <TH>Último acesso</TH>
                      <TH>Situação</TH>
                      <TH className="text-right">
                        <span className="sr-only">Ações</span>
                      </TH>
                    </tr>
                  </THead>
                  <TBody>
                    {pg.slice.map((u) => (
                      <TR key={u.id}>
                        <TD>
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} className="size-8" />
                            <div className="min-w-0">
                              <p className="font-medium">
                                {u.name} {u.id === self?.id && <Badge tone="info">Você</Badge>}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <Badge tone="primary">{ROLES[u.role].name}</Badge>
                        </TD>
                        <TD className="text-muted-foreground">{link(u) ?? '—'}</TD>
                        <TD className="whitespace-nowrap text-xs tabular text-muted-foreground">{u.lastAccessAt ? formatDateTimeShort(u.lastAccessAt) : 'Nunca'}</TD>
                        <TD>
                          <StatusBadge meta={ACTIVE_META[`${u.active}`]} />
                        </TD>
                        <TD>{actions(u)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              <ul className="divide-y md:hidden">
                {pg.slice.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 p-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="primary">{ROLES[u.role].name}</Badge>
                        <StatusBadge meta={ACTIVE_META[`${u.active}`]} />
                      </div>
                    </div>
                    {actions(u)}
                  </li>
                ))}
              </ul>
              <Pagination {...pg} />
            </>
          )}
        </QueryState>
      </Card>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent title={form.item ? `Editar usuário — ${form.item.name}` : 'Novo usuário'}>
            <UserForm initial={form.item} all={query.data ?? []} onDone={() => setForm(null)} />
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir usuário?"
        description={`A conta de ${removing?.name ?? ''} será removida. Os registros de auditoria do usuário serão preservados. Considere inativar a conta em vez de excluí-la.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (removing) await remove.run(removing.id)
        }}
      />
    </>
  )
}
