import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarRange, Crown, FileText, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Card, StatusBadge } from '@/components/ui/display'
import { Checkbox, Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { Dialog, DialogContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, QueryState } from '@/components/common/states'
import { PageHeader, SearchInput, Toolbar } from '@/components/common/page'
import { useAction, useCollection, useLookups, usePermission } from '@/hooks/useData'
import { committeeService } from '@/services/registryServices'
import { CommitteeKindLabel } from '@/domain/labels'
import { formatDate, todayISO } from '@/lib/format'
import { matches, uid } from '@/lib/utils'
import type { Committee, CommitteeKind } from '@/types'
import { COMMITTEE_STATUS_META } from './shared'

const schema = z
  .object({
    name: z.string().trim().min(5, 'Informe o nome.'),
    acronym: z
      .string()
      .trim()
      .min(2, 'Mínimo de 2 caracteres.')
      .max(10, 'Máximo de 10 caracteres.')
      .transform((v) => v.toUpperCase()),
    kind: z.enum(['permanent', 'temporary']),
    startDate: z.string().min(1, 'Informe a data inicial.'),
    endDate: z.string().optional(),
    presidentId: z.string().min(1, 'Selecione o presidente.'),
    vicePresidentId: z.string().min(1, 'Selecione o vice-presidente.'),
    memberIds: z.array(z.string()).min(3, 'A comissão deve ter ao menos 3 membros.'),
    description: z.string().max(600, 'Máximo de 600 caracteres.'),
    status: z.enum(['active', 'closed']),
  })
  .refine((v) => v.kind === 'permanent' || !!v.endDate, { path: ['endDate'], message: 'Comissões temporárias exigem data final.' })
  .refine((v) => !v.endDate || v.endDate > v.startDate, { path: ['endDate'], message: 'A data final deve ser posterior à inicial.' })
  .refine((v) => v.presidentId !== v.vicePresidentId, { path: ['vicePresidentId'], message: 'Presidente e vice devem ser vereadores diferentes.' })

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

function CommitteeForm({ initial, onDone }: { initial?: Committee; onDone: () => void }) {
  const councilors = useCollection('councilors')
  const active = (councilors.data ?? []).filter((c) => c.status === 'active' || initial?.memberIds.includes(c.id))
  const { register, handleSubmit, formState, control, watch } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial, endDate: initial.endDate ?? '' }
      : { name: '', acronym: '', kind: 'permanent', startDate: todayISO(), endDate: '', presidentId: '', vicePresidentId: '', memberIds: [], description: '', status: 'active' },
  })
  const e = formState.errors
  const kind = watch('kind')
  const save = useAction(
    async (v: FormValues) => {
      // Presidente e vice são automaticamente membros.
      const memberIds = [...new Set([v.presidentId, v.vicePresidentId, ...v.memberIds])]
      const data = { ...v, memberIds, endDate: v.endDate || undefined }
      return initial ? committeeService.update(initial.id, data) : committeeService.create({ id: uid('cm'), ...data })
    },
    { success: initial ? 'Comissão atualizada.' : 'Comissão cadastrada com sucesso.', onSuccess: onDone },
  )

  const councilorOptions = active.map((c) => (
    <option key={c.id} value={c.id}>
      {c.parliamentaryName}
    </option>
  ))

  return (
    <form onSubmit={handleSubmit((v) => save.run(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Nome" required className="sm:col-span-2" error={e.name?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.name || undefined} {...register('name')} />}
      </Field>
      <Field label="Sigla" required error={e.acronym?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} className="uppercase" aria-invalid={!!e.acronym || undefined} {...register('acronym')} />}
      </Field>
      <Field label="Tipo" required>
        {(id) => (
          <NativeSelect id={id} {...register('kind')}>
            {(Object.keys(CommitteeKindLabel) as CommitteeKind[]).map((k) => (
              <option key={k} value={k}>
                {CommitteeKindLabel[k]}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Data inicial" required error={e.startDate?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} type="date" {...register('startDate')} />}
      </Field>
      <Field label="Data final" required={kind === 'temporary'} error={e.endDate?.message} hint={kind === 'permanent' ? 'Opcional para comissões permanentes.' : undefined}>
        {(id, d) => <Input id={id} aria-describedby={d} type="date" aria-invalid={!!e.endDate || undefined} {...register('endDate')} />}
      </Field>
      <Field label="Presidente" required error={e.presidentId?.message}>
        {(id, d) => (
          <NativeSelect id={id} aria-describedby={d} aria-invalid={!!e.presidentId || undefined} {...register('presidentId')}>
            <option value="">Selecione…</option>
            {councilorOptions}
          </NativeSelect>
        )}
      </Field>
      <Field label="Vice-presidente" required error={e.vicePresidentId?.message}>
        {(id, d) => (
          <NativeSelect id={id} aria-describedby={d} aria-invalid={!!e.vicePresidentId || undefined} {...register('vicePresidentId')}>
            <option value="">Selecione…</option>
            {councilorOptions}
          </NativeSelect>
        )}
      </Field>
      <fieldset className="sm:col-span-2" aria-describedby={e.memberIds ? 'members-error' : undefined}>
        <legend className="mb-2 text-sm font-medium">
          Membros <span className="text-danger" aria-hidden>*</span>
        </legend>
        <Controller
          control={control}
          name="memberIds"
          render={({ field }) => (
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
              {active.map((c) => {
                const checked = field.value.includes(c.id)
                return (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                    <Checkbox checked={checked} onCheckedChange={(v) => field.onChange(v ? [...field.value, c.id] : field.value.filter((m) => m !== c.id))} aria-label={c.parliamentaryName} />
                    {c.parliamentaryName}
                  </label>
                )
              })}
            </div>
          )}
        />
        {e.memberIds ? (
          <p id="members-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {e.memberIds.message}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">Presidente e vice são incluídos automaticamente como membros.</p>
        )}
      </fieldset>
      <Field label="Descrição / competência" className="sm:col-span-2" error={e.description?.message}>
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} {...register('description')} />}
      </Field>
      <Field label="Situação" required>
        {(id) => (
          <NativeSelect id={id} {...register('status')}>
            <option value="active">Em funcionamento</option>
            <option value="closed">Encerrada</option>
          </NativeSelect>
        )}
      </Field>
      <div className="flex items-end justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          {initial ? 'Salvar' : 'Cadastrar comissão'}
        </Button>
      </div>
    </form>
  )
}

export default function CommitteesPage() {
  const query = useCollection('committees')
  const propositions = useCollection('propositions')
  const lk = useLookups()
  const can = usePermission()
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'all' | CommitteeKind>('all')
  const [form, setForm] = useState<{ item?: Committee } | null>(null)
  const [removing, setRemoving] = useState<Committee | null>(null)
  const remove = useAction((id: string) => committeeService.remove(id), { success: 'Comissão excluída.' })

  const matters = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of propositions.data ?? []) for (const c of p.committeeIds) map.set(c, (map.get(c) ?? 0) + 1)
    return map
  }, [propositions.data])
  const filtered = (query.data ?? []).filter((c) => (kind === 'all' || c.kind === kind) && matches([c.name, c.acronym, c.description], search))

  return (
    <>
      <PageHeader
        title="Comissões"
        description="Comissões permanentes e temporárias, composição e matérias em análise."
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Processo legislativo' }, { label: 'Comissões' }]}
        actions={
          can('committees', 'create') && (
            <Button onClick={() => setForm({})}>
              <Plus /> Nova comissão
            </Button>
          )
        }
      />
      <Card className="mb-4">
        <Toolbar className="border-b-0">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar comissão" />
          <Tabs value={kind} onValueChange={(v) => setKind(v as typeof kind)} className="w-full sm:w-auto">
            <TabsList className="border-b-0">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="permanent">Permanentes</TabsTrigger>
              <TabsTrigger value="temporary">Temporárias</TabsTrigger>
            </TabsList>
          </Tabs>
        </Toolbar>
      </Card>
      <QueryState query={query} isEmpty={() => filtered.length === 0} empty={<Card><EmptyState icon={Users} title="Nenhuma comissão encontrada" /></Card>}>
        {() => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => {
              const president = lk.councilors.get(c.presidentId)
              return (
                <Card key={c.id} className="flex flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{c.acronym}</Badge>
                    <Badge>{CommitteeKindLabel[c.kind]}</Badge>
                    <StatusBadge meta={COMMITTEE_STATUS_META[c.status]} className="ml-auto" />
                  </div>
                  <Link to={`/admin/comissoes/${c.id}`} className="mt-3 font-semibold leading-snug hover:underline">
                    {c.name}
                  </Link>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Crown className="size-4 text-brand-2" aria-hidden />
                    <span className="text-muted-foreground">Presidente:</span>
                    <span className="truncate font-medium">{president?.parliamentaryName ?? '—'}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex -space-x-2" aria-label={`${c.memberIds.length} membros`}>
                      {c.memberIds.slice(0, 5).map((m) => {
                        const cv = lk.councilors.get(m)
                        return <Avatar key={m} name={cv?.parliamentaryName ?? '?'} src={cv?.photoUrl} color={lk.partyOf(m)?.color} className="size-8 border-2 border-card text-xs" />
                      })}
                      {c.memberIds.length > 5 && <span className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs font-medium">+{c.memberIds.length - 5}</span>}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="size-3.5" aria-hidden /> {matters.get(c.id) ?? 0} matéria(s)
                    </span>
                  </div>
                  <p className="mb-4 mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarRange className="size-3.5" aria-hidden /> {formatDate(c.startDate)}
                    {c.endDate ? ` a ${formatDate(c.endDate)}` : ' — sem prazo'}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/admin/comissoes/${c.id}`}>Detalhes</Link>
                    </Button>
                    {can('committees', 'edit') && (
                      <Button variant="ghost" size="sm" onClick={() => setForm({ item: c })}>
                        <Pencil /> Editar
                      </Button>
                    )}
                    {can('committees', 'delete') && (
                      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setRemoving(c)}>
                        <Trash2 /> Excluir
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </QueryState>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent size="lg" title={form.item ? `Editar — ${form.item.acronym}` : 'Nova comissão'}>
            <CommitteeForm initial={form.item} onDone={() => setForm(null)} />
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir comissão?"
        description={`A ${removing?.name ?? ''} será removida. Comissões com matérias vinculadas não podem ser excluídas — altere a situação para "Encerrada".`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (removing) await remove.run(removing.id)
        }}
      />
    </>
  )
}
