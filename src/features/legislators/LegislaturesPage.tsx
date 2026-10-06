import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookOpen, CalendarRange, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, Card, StatusBadge } from '@/components/ui/display'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { Dialog, DialogContent, SheetContent } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, QueryState } from '@/components/common/states'
import { PageHeader } from '@/components/common/page'
import { useAction, useCollection, useLookups, useOrganization, usePermission } from '@/hooks/useData'
import { legislatureService } from '@/services/registryServices'
import { BoardRoleLabel, CouncilorStatusMeta, LegislatureStatusMeta } from '@/domain/labels'
import { formatDate } from '@/lib/format'
import { uid } from '@/lib/utils'
import type { Legislature, LegislatureStatus } from '@/types'

const STATUSES = Object.keys(LegislatureStatusMeta) as LegislatureStatus[]

const schema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome.'),
    number: z.coerce.number().int('Número inteiro.').min(1, 'Número inválido.'),
    startDate: z.string().min(1, 'Informe a data inicial.'),
    endDate: z.string().min(1, 'Informe a data final.'),
    status: z.enum(['active', 'closed', 'future']),
    notes: z.string().max(500, 'Máximo de 500 caracteres.'),
  })
  .refine((v) => v.endDate > v.startDate, { path: ['endDate'], message: 'A data final deve ser posterior à inicial.' })

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

function LegislatureForm({ initial, all, onDone }: { initial?: Legislature; all: Legislature[]; onDone: () => void }) {
  const { register, handleSubmit, formState } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { name: '', number: (Math.max(0, ...all.map((l) => l.number)) || 0) + 1, startDate: '', endDate: '', status: 'future', notes: '' },
  })
  const e = formState.errors
  const save = useAction(
    async (v: FormValues) => {
      if (all.some((l) => l.number === v.number && l.id !== initial?.id)) throw new Error(`Já existe a ${v.number}ª Legislatura.`)
      if (v.status === 'active' && all.some((l) => l.status === 'active' && l.id !== initial?.id)) throw new Error('Já existe uma legislatura em curso. Encerre-a antes de ativar outra.')
      return initial ? legislatureService.update(initial.id, v) : legislatureService.create({ id: uid('leg'), ...v })
    },
    { success: initial ? 'Legislatura atualizada.' : 'Legislatura cadastrada com sucesso.', onSuccess: onDone },
  )
  return (
    <form onSubmit={handleSubmit((v) => save.run(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Nome" required error={e.name?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} placeholder="21ª Legislatura" aria-invalid={!!e.name || undefined} {...register('name')} />}
      </Field>
      <Field label="Número" required error={e.number?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} {...register('number')} />}
      </Field>
      <Field label="Data inicial" required error={e.startDate?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} type="date" {...register('startDate')} />}
      </Field>
      <Field label="Data final" required error={e.endDate?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} type="date" aria-invalid={!!e.endDate || undefined} {...register('endDate')} />}
      </Field>
      <Field label="Situação" required>
        {(id) => (
          <NativeSelect id={id} {...register('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LegislatureStatusMeta[s].label}
              </option>
            ))}
          </NativeSelect>
        )}
      </Field>
      <Field label="Observações" className="sm:col-span-2" error={e.notes?.message}>
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={3} {...register('notes')} />}
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          {initial ? 'Salvar alterações' : 'Cadastrar legislatura'}
        </Button>
      </div>
    </form>
  )
}

export default function LegislaturesPage() {
  const query = useCollection('legislatures')
  const councilors = useCollection('councilors')
  const lk = useLookups()
  const can = usePermission()
  const { data: org } = useOrganization()
  const [form, setForm] = useState<{ item?: Legislature } | null>(null)
  const [viewing, setViewing] = useState<Legislature | null>(null)
  const [removing, setRemoving] = useState<Legislature | null>(null)
  const remove = useAction((id: string) => legislatureService.remove(id), { success: 'Legislatura excluída.' })

  const linked = (legId: string) => (councilors.data ?? []).filter((c) => c.legislatureId === legId)
  const sorted = [...(query.data ?? [])].sort((a, b) => b.number - a.number)

  return (
    <>
      <PageHeader
        title="Legislaturas"
        description="Períodos de mandato da Câmara e composição de vereadores vinculados."
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Cadastros' }, { label: 'Legislaturas' }]}
        actions={
          can('legislatures', 'create') && (
            <Button onClick={() => setForm({})}>
              <Plus /> Nova legislatura
            </Button>
          )
        }
      />
      <QueryState query={query} isEmpty={(d) => d.length === 0} empty={<EmptyState icon={BookOpen} title="Nenhuma legislatura cadastrada" />}>
        {() => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((l) => {
              const members = linked(l.id)
              return (
                <Card key={l.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nº {l.number}</p>
                      <h2 className="mt-1 text-lg font-semibold">{l.name}</h2>
                    </div>
                    <StatusBadge meta={LegislatureStatusMeta[l.status]} />
                  </div>
                  {l.id === org?.currentLegislatureId && <p className="mt-1 text-xs font-medium text-primary">Legislatura vigente da Câmara</p>}
                  <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarRange className="size-4" aria-hidden /> {formatDate(l.startDate)} a {formatDate(l.endDate)}
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" aria-hidden /> {members.length} vereador(es) vinculado(s)
                  </p>
                  {l.notes && <p className="mt-3 line-clamp-3 text-sm">{l.notes}</p>}
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Button variant="outline" size="sm" onClick={() => setViewing(l)}>
                      <Users /> Vereadores
                    </Button>
                    {can('legislatures', 'edit') && (
                      <Button variant="ghost" size="sm" onClick={() => setForm({ item: l })}>
                        <Pencil /> Editar
                      </Button>
                    )}
                    {can('legislatures', 'delete') && (
                      <Button variant="ghost" size="sm" className="text-danger" onClick={() => setRemoving(l)}>
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
          <DialogContent title={form.item ? `Editar — ${form.item.name}` : 'Nova legislatura'}>
            <LegislatureForm initial={form.item} all={query.data ?? []} onDone={() => setForm(null)} />
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        {viewing && (
          <SheetContent title={`Vereadores — ${viewing.name}`} description={`${formatDate(viewing.startDate)} a ${formatDate(viewing.endDate)}`}>
            {linked(viewing.id).length === 0 ? (
              <EmptyState icon={Users} title="Nenhum vereador vinculado" />
            ) : (
              <ul className="divide-y rounded-lg border">
                {linked(viewing.id).map((c) => {
                  const party = lk.parties.get(c.partyId)
                  return (
                    <li key={c.id}>
                      <Link to={`/admin/vereadores/${c.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                        <Avatar name={c.parliamentaryName} src={c.photoUrl} color={party?.color} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.parliamentaryName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {party?.acronym} · {c.mandate === 'holder' ? 'Titular' : 'Suplente'}
                            {c.boardRole ? ` · ${BoardRoleLabel[c.boardRole]}` : ''}
                          </span>
                        </span>
                        <StatusBadge meta={CouncilorStatusMeta[c.status]} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </SheetContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir legislatura?"
        description={`A ${removing?.name ?? ''} será removida. Legislaturas com vereadores vinculados não podem ser excluídas.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (removing) await remove.run(removing.id)
        }}
      />
    </>
  )
}
