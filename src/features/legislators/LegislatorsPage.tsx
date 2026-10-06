import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, Landmark, MoreHorizontal, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Card, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { Dialog, DialogContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, QueryState } from '@/components/common/states'
import { PageHeader, Pagination, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { useAction, useCollection, useLookups, useOrganization, usePermission } from '@/hooks/useData'
import { councilorService } from '@/services/registryServices'
import { BoardRoleLabel, CouncilorStatusMeta } from '@/domain/labels'
import { formatCPF, formatPhone } from '@/lib/format'
import { matches, uid } from '@/lib/utils'
import type { BoardRole, Councilor, CouncilorStatus, MandateType } from '@/types'
import { ImagePicker } from './shared'

const BOARD_ROLES = Object.keys(BoardRoleLabel) as BoardRole[]
const STATUSES = Object.keys(CouncilorStatusMeta) as CouncilorStatus[]

const schema = z
  .object({
    fullName: z.string().trim().min(5, 'Informe o nome completo.'),
    parliamentaryName: z.string().trim().min(3, 'Informe o nome parlamentar.'),
    photoUrl: z.string().optional(),
    cpf: z
      .string()
      .optional()
      .refine((v) => !v || v.replace(/\D/g, '').length === 11, 'CPF deve conter 11 dígitos.'),
    partyId: z.string().min(1, 'Selecione o partido.'),
    legislatureId: z.string().min(1, 'Selecione a legislatura.'),
    mandate: z.enum(['holder', 'substitute']),
    mandateStart: z.string().min(1, 'Informe o início do mandato.'),
    mandateEnd: z.string().min(1, 'Informe o fim do mandato.'),
    email: z.string().trim().email('E-mail inválido.'),
    phone: z.string().refine((v) => v.replace(/\D/g, '').length >= 10, 'Telefone inválido.'),
    status: z.enum(['active', 'licensed', 'inactive']),
    boardRole: z.string(),
    bio: z.string().max(600, 'Máximo de 600 caracteres.'),
  })
  .refine((v) => v.mandateEnd >= v.mandateStart, { path: ['mandateEnd'], message: 'O fim deve ser posterior ao início.' })

type FormValues = z.infer<typeof schema>

function CouncilorForm({ initial, onDone }: { initial?: Councilor; onDone: () => void }) {
  const parties = useCollection('parties')
  const legislatures = useCollection('legislatures')
  const councilors = useCollection('councilors')
  const { data: org } = useOrganization()
  const currentLeg = legislatures.data?.find((l) => l.id === org?.currentLegislatureId)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initial?.fullName ?? '',
      parliamentaryName: initial?.parliamentaryName ?? '',
      photoUrl: initial?.photoUrl,
      cpf: initial?.cpf ?? '',
      partyId: initial?.partyId ?? '',
      legislatureId: initial?.legislatureId ?? org?.currentLegislatureId ?? '',
      mandate: initial?.mandate ?? 'holder',
      mandateStart: initial?.mandateStart ?? currentLeg?.startDate ?? '',
      mandateEnd: initial?.mandateEnd ?? currentLeg?.endDate ?? '',
      email: initial?.email ?? '',
      phone: initial?.phone ?? '',
      status: initial?.status ?? 'active',
      boardRole: initial?.boardRole ?? '',
      bio: initial?.bio ?? '',
    },
  })
  const { register, handleSubmit, formState, watch, setValue } = form
  const e = formState.errors

  const save = useAction(
    async (v: FormValues) => {
      const boardRole = (v.boardRole || null) as BoardRole | null
      if (boardRole) {
        const holder = (councilors.data ?? []).find((c) => c.boardRole === boardRole && c.legislatureId === v.legislatureId && c.id !== initial?.id && c.status === 'active')
        if (holder) throw new Error(`O cargo de ${BoardRoleLabel[boardRole]} já está ocupado por ${holder.parliamentaryName}.`)
      }
      const data: Omit<Councilor, 'id'> = { ...v, cpf: v.cpf || undefined, photoUrl: v.photoUrl || undefined, mandate: v.mandate as MandateType, boardRole }
      return initial ? councilorService.update(initial.id, data) : councilorService.create({ id: uid('cv'), ...data })
    },
    { success: initial ? 'Vereador atualizado com sucesso.' : 'Vereador cadastrado com sucesso.', onSuccess: onDone },
  )

  return (
    <form id="councilor-form" onSubmit={handleSubmit((v) => save.run(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <ImagePicker label="Foto" value={watch('photoUrl')} onChange={(v) => setValue('photoUrl', v, { shouldDirty: true })} fallback={<UserRound className="size-7 text-muted-foreground" aria-hidden />} />
      </div>
      <Field label="Nome completo" required error={e.fullName?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.fullName || undefined} autoComplete="name" {...register('fullName')} />}
      </Field>
      <Field label="Nome parlamentar" required error={e.parliamentaryName?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.parliamentaryName || undefined} {...register('parliamentaryName')} />}
      </Field>
      <Field label="CPF" hint="Opcional nesta demonstração." error={e.cpf?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" placeholder="000.000.000-00" {...register('cpf', { onChange: (ev) => setValue('cpf', formatCPF(ev.target.value)) })} />}
      </Field>
      <Field label="Partido" required error={e.partyId?.message}>
        {(id, d) => (
          <NativeSelect id={id} aria-describedby={d} aria-invalid={!!e.partyId || undefined} {...register('partyId')}>
            <option value="">Selecione…</option>
            {(parties.data ?? []).map((p) => (
              <option key={p.id} value={p.id} disabled={p.status === 'inactive' && p.id !== initial?.partyId}>
                {p.acronym} — {p.name}
                {p.status === 'inactive' ? ' (inativo)' : ''}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Legislatura" required error={e.legislatureId?.message}>
        {(id, d) => (
          <NativeSelect id={id} aria-describedby={d} {...register('legislatureId')}>
            <option value="">Selecione…</option>
            {(legislatures.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Mandato" required>
        {(id) => (
          <NativeSelect id={id} {...register('mandate')}>
            <option value="holder">Titular</option>
            <option value="substitute">Suplente</option>
          </NativeSelect>
        )}
      </Field>
      <Field label="Início do mandato" required error={e.mandateStart?.message}>
        {(id, d) => <Input id={id} type="date" aria-describedby={d} {...register('mandateStart')} />}
      </Field>
      <Field label="Fim do mandato" required error={e.mandateEnd?.message}>
        {(id, d) => <Input id={id} type="date" aria-describedby={d} aria-invalid={!!e.mandateEnd || undefined} {...register('mandateEnd')} />}
      </Field>
      <Field label="E-mail" required error={e.email?.message}>
        {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!e.email || undefined} autoComplete="email" {...register('email')} />}
      </Field>
      <Field label="Telefone" required error={e.phone?.message}>
        {(id, d) => <Input id={id} inputMode="tel" aria-describedby={d} aria-invalid={!!e.phone || undefined} placeholder="(00) 00000-0000" {...register('phone', { onChange: (ev) => setValue('phone', formatPhone(ev.target.value)) })} />}
      </Field>
      <Field label="Situação" required>
        {(id) => (
          <NativeSelect id={id} {...register('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {CouncilorStatusMeta[s].label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Cargo na Mesa Diretora">
        {(id) => (
          <NativeSelect id={id} {...register('boardRole')}>
            <option value="">Nenhum</option>
            {BOARD_ROLES.map((r) => (
              <option key={r} value={r}>
                {BoardRoleLabel[r]}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Biografia / atuação" className="sm:col-span-2" error={e.bio?.message}>
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} {...register('bio')} />}
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          {initial ? 'Salvar alterações' : 'Cadastrar vereador'}
        </Button>
      </div>
    </form>
  )
}

export default function LegislatorsPage() {
  const query = useCollection('councilors')
  const lk = useLookups()
  const can = usePermission()
  const [search, setSearch] = useState('')
  const [party, setParty] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Councilor | null>(null)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<Councilor | null>(null)
  const remove = useAction((id: string) => councilorService.remove(id), { success: 'Vereador excluído.' })

  const filtered = useMemo(
    () =>
      (query.data ?? [])
        .filter((c) => (!party || c.partyId === party) && (!status || c.status === status) && matches([c.fullName, c.parliamentaryName, c.email, lk.parties.get(c.partyId)?.acronym], search))
        .sort((a, b) => (a.boardRole ? 0 : 1) - (b.boardRole ? 0 : 1) || a.parliamentaryName.localeCompare(b.parliamentaryName, 'pt-BR')),
    [query.data, party, status, search, lk.parties],
  )
  const pg = usePagination(filtered, 12)
  const formOpen = creating || !!editing

  const actions = (c: Councilor) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${c.parliamentaryName}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link to={`/admin/vereadores/${c.id}`}>
            <Eye /> Ver detalhes
          </Link>
        </DropdownMenuItem>
        {can('councilors', 'edit') && (
          <DropdownMenuItem onSelect={() => setEditing(c)}>
            <Pencil /> Editar
          </DropdownMenuItem>
        )}
        {can('councilors', 'delete') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setRemoving(c)}>
              <Trash2 /> Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <PageHeader
        title="Vereadores"
        description="Composição da Câmara, mandatos, filiação partidária e cargos da Mesa Diretora."
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Cadastros' }, { label: 'Vereadores' }]}
        actions={
          can('councilors', 'create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Novo vereador
            </Button>
          )
        }
      />
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail ou partido" />
          <NativeSelect value={party} onChange={(e) => setParty(e.target.value)} className="w-full sm:w-44" aria-label="Filtrar por partido">
            <option value="">Todos os partidos</option>
            {[...lk.parties.values()].map((p) => (
              <option key={p.id} value={p.id}>
                {p.acronym}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-44" aria-label="Filtrar por situação">
            <option value="">Todas as situações</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {CouncilorStatusMeta[s].label}
              </option>
            ))}
          </NativeSelect>
        </Toolbar>
        <QueryState query={query} isEmpty={() => filtered.length === 0} empty={<EmptyState icon={Landmark} title="Nenhum vereador encontrado" description="Ajuste os filtros ou cadastre um novo vereador." />}>
          {() => (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <tr>
                      <TH>Vereador</TH>
                      <TH>Partido</TH>
                      <TH>Mandato</TH>
                      <TH>Contato</TH>
                      <TH>Situação</TH>
                      <TH className="w-12">
                        <span className="sr-only">Ações</span>
                      </TH>
                    </tr>
                  </THead>
                  <TBody>
                    {pg.slice.map((c) => {
                      const p = lk.parties.get(c.partyId)
                      return (
                        <TR key={c.id}>
                          <TD>
                            <Link to={`/admin/vereadores/${c.id}`} className="flex items-center gap-3 hover:underline">
                              <Avatar name={c.parliamentaryName} src={c.photoUrl} color={p?.color} />
                              <span className="min-w-0">
                                <span className="block font-medium">{c.parliamentaryName}</span>
                                <span className="block truncate text-xs text-muted-foreground">{c.fullName}</span>
                              </span>
                            </Link>
                          </TD>
                          <TD>
                            <Badge>
                              <span className="size-2 rounded-full" style={{ background: p?.color }} aria-hidden />
                              {p?.acronym ?? '—'}
                            </Badge>
                          </TD>
                          <TD>
                            <span className="block">{c.mandate === 'holder' ? 'Titular' : 'Suplente'}</span>
                            {c.boardRole && <span className="text-xs font-medium text-primary">{BoardRoleLabel[c.boardRole]}</span>}
                          </TD>
                          <TD className="text-xs text-muted-foreground">
                            <span className="block">{c.email}</span>
                            <span className="block">{c.phone}</span>
                          </TD>
                          <TD>
                            <StatusBadge meta={CouncilorStatusMeta[c.status]} />
                          </TD>
                          <TD>{actions(c)}</TD>
                        </TR>
                      )
                    })}
                  </TBody>
                </Table>
              </div>
              {/* Mobile/tablet: cards */}
              <ul className="grid gap-3 p-3 sm:grid-cols-2 md:hidden">
                {pg.slice.map((c) => {
                  const p = lk.parties.get(c.partyId)
                  return (
                    <li key={c.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Avatar name={c.parliamentaryName} src={c.photoUrl} color={p?.color} className="size-11" />
                      <div className="min-w-0 flex-1">
                        <Link to={`/admin/vereadores/${c.id}`} className="block truncate font-medium hover:underline">
                          {c.parliamentaryName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {p?.acronym} · {c.mandate === 'holder' ? 'Titular' : 'Suplente'}
                          {c.boardRole ? ` · ${BoardRoleLabel[c.boardRole]}` : ''}
                        </p>
                        <StatusBadge meta={CouncilorStatusMeta[c.status]} className="mt-2" />
                      </div>
                      {actions(c)}
                    </li>
                  )
                })}
              </ul>
              <Pagination {...pg} />
            </>
          )}
        </QueryState>
      </Card>

      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
      >
        {formOpen && (
          <DialogContent size="lg" title={editing ? `Editar vereador — ${editing.parliamentaryName}` : 'Novo vereador'} description="Campos marcados com * são obrigatórios.">
            <CouncilorForm
              key={editing?.id ?? 'new'}
              initial={editing ?? undefined}
              onDone={() => {
                setCreating(false)
                setEditing(null)
              }}
            />
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir vereador?"
        description={`O cadastro de ${removing?.parliamentaryName ?? ''} será removido. Vereadores com votos registrados não podem ser excluídos — altere a situação para "Inativo".`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (removing) await remove.run(removing.id)
        }}
      />
    </>
  )
}
