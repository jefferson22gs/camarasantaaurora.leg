import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flag, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Field, Input, NativeSelect } from '@/components/ui/form-controls'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, QueryState } from '@/components/common/states'
import { PageHeader, SearchInput, Toolbar } from '@/components/common/page'
import { ImagePicker } from '@/features/legislators/shared'
import { useAction, useCollection, usePermission } from '@/hooks/useData'
import { partyService } from '@/services/registryServices'
import { matches, uid } from '@/lib/utils'
import type { Party, PartyStatus } from '@/types'

const STATUS_META: Record<PartyStatus, { label: string; tone: 'success' | 'neutral' }> = {
  active: { label: 'Ativo', tone: 'success' },
  inactive: { label: 'Inativo', tone: 'neutral' },
}

const schema = z.object({
  acronym: z
    .string()
    .trim()
    .min(2, 'Mínimo de 2 caracteres.')
    .max(10, 'Máximo de 10 caracteres.')
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(3, 'Informe o nome.'),
  number: z.coerce.number().int('Número inteiro.').min(10, 'Número entre 10 e 99.').max(99, 'Número entre 10 e 99.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.'),
  logoUrl: z.string().optional(),
  status: z.enum(['active', 'inactive']),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

function PartyLogo({ party, className = 'size-10' }: { party: Pick<Party, 'acronym' | 'color' | 'logoUrl'>; className?: string }) {
  if (party.logoUrl) return <img src={party.logoUrl} alt={`Logo ${party.acronym}`} className={`${className} shrink-0 rounded-lg border object-contain`} />
  return (
    <span className={`${className} grid shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white`} style={{ background: party.color }} aria-hidden>
      {party.acronym.slice(0, 3)}
    </span>
  )
}

function PartyForm({ initial, all, onDone }: { initial?: Party; all: Party[]; onDone: () => void }) {
  const { register, handleSubmit, formState, watch, setValue } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { acronym: '', name: '', number: undefined, color: '#1d4ed8', status: 'active' },
  })
  const e = formState.errors
  const save = useAction(
    async (v: FormValues) => {
      if (all.some((p) => p.id !== initial?.id && p.acronym === v.acronym)) throw new Error(`A sigla ${v.acronym} já está em uso.`)
      if (all.some((p) => p.id !== initial?.id && p.number === v.number)) throw new Error(`O número ${v.number} já está em uso.`)
      const data = { ...v, logoUrl: v.logoUrl || undefined }
      return initial ? partyService.update(initial.id, data) : partyService.create({ id: uid('pty'), ...data })
    },
    { success: initial ? 'Partido atualizado.' : 'Partido cadastrado com sucesso.', onSuccess: onDone },
  )
  const acronym = watch('acronym') || 'SIGLA'
  return (
    <form onSubmit={handleSubmit((v) => save.run(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <ImagePicker label="Logo" rounded={false} value={watch('logoUrl')} onChange={(v) => setValue('logoUrl', v, { shouldDirty: true })} fallback={<PartyLogo party={{ acronym, color: watch('color'), logoUrl: undefined }} className="size-16" />} />
      </div>
      <Field label="Sigla" required error={e.acronym?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} className="uppercase" aria-invalid={!!e.acronym || undefined} {...register('acronym')} />}
      </Field>
      <Field label="Número" required error={e.number?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} type="number" min={10} max={99} aria-invalid={!!e.number || undefined} {...register('number')} />}
      </Field>
      <Field label="Nome" required className="sm:col-span-2" error={e.name?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!e.name || undefined} {...register('name')} />}
      </Field>
      <Field label="Cor de identificação" required error={e.color?.message} hint="Usada em gráficos e avatares.">
        {(id, d) => (
          <div className="flex gap-2">
            <input type="color" aria-label="Seletor de cor" className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-card p-1" value={watch('color')} onChange={(ev) => setValue('color', ev.target.value, { shouldValidate: true })} />
            <Input id={id} aria-describedby={d} {...register('color')} />
          </div>
        )}
      </Field>
      <Field label="Situação" required>
        {(id) => (
          <NativeSelect id={id} {...register('status')}>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </NativeSelect>
        )}
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          {initial ? 'Salvar alterações' : 'Cadastrar partido'}
        </Button>
      </div>
    </form>
  )
}

export default function PartiesPage() {
  const query = useCollection('parties')
  const councilors = useCollection('councilors')
  const can = usePermission()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<{ item?: Party } | null>(null)
  const [removing, setRemoving] = useState<Party | null>(null)
  const remove = useAction((id: string) => partyService.remove(id), { success: 'Partido excluído.' })

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of councilors.data ?? []) if (c.status !== 'inactive') map.set(c.partyId, (map.get(c.partyId) ?? 0) + 1)
    return map
  }, [councilors.data])
  const filtered = (query.data ?? []).filter((p) => matches([p.acronym, p.name, p.number], search)).sort((a, b) => a.acronym.localeCompare(b.acronym))

  const rowActions = (p: Party) => (
    <div className="flex justify-end gap-1">
      {can('parties', 'edit') && (
        <Button variant="ghost" size="icon-sm" onClick={() => setForm({ item: p })} aria-label={`Editar ${p.acronym}`}>
          <Pencil />
        </Button>
      )}
      {can('parties', 'delete') && (
        <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(p)} aria-label={`Excluir ${p.acronym}`}>
          <Trash2 className="text-danger" />
        </Button>
      )}
    </div>
  )

  return (
    <>
      <PageHeader
        title="Partidos"
        description="Agremiações partidárias utilizadas no cadastro de vereadores. Dados fictícios nesta demonstração."
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Cadastros' }, { label: 'Partidos' }]}
        actions={
          can('parties', 'create') && (
            <Button onClick={() => setForm({})}>
              <Plus /> Novo partido
            </Button>
          )
        }
      />
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por sigla, nome ou número" />
        </Toolbar>
        <QueryState query={query} isEmpty={() => filtered.length === 0} empty={<EmptyState icon={Flag} title="Nenhum partido encontrado" />}>
          {() => (
            <>
              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <tr>
                      <TH>Partido</TH>
                      <TH>Número</TH>
                      <TH>Vereadores</TH>
                      <TH>Situação</TH>
                      <TH className="text-right">
                        <span className="sr-only">Ações</span>
                      </TH>
                    </tr>
                  </THead>
                  <TBody>
                    {filtered.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <div className="flex items-center gap-3">
                            <PartyLogo party={p} />
                            <div className="min-w-0">
                              <p className="font-semibold">{p.acronym}</p>
                              <p className="truncate text-xs text-muted-foreground">{p.name}</p>
                            </div>
                          </div>
                        </TD>
                        <TD className="tabular">{p.number}</TD>
                        <TD className="tabular">{counts.get(p.id) ?? 0}</TD>
                        <TD>
                          <StatusBadge meta={STATUS_META[p.status]} />
                        </TD>
                        <TD>{rowActions(p)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              <ul className="divide-y sm:hidden">
                {filtered.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-3">
                    <PartyLogo party={p} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {p.acronym} <span className="font-normal text-muted-foreground">· {p.number}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{p.name}</p>
                      <p className="mt-1 text-xs">
                        {counts.get(p.id) ?? 0} vereador(es) · <StatusBadge meta={STATUS_META[p.status]} />
                      </p>
                    </div>
                    {rowActions(p)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryState>
      </Card>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent title={form.item ? `Editar partido — ${form.item.acronym}` : 'Novo partido'}>
            <PartyForm initial={form.item} all={query.data ?? []} onDone={() => setForm(null)} />
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir partido?"
        description={`O partido ${removing?.acronym ?? ''} será removido. Partidos com vereadores filiados não podem ser excluídos — utilize a situação "Inativo".`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (removing) await remove.run(removing.id)
        }}
      />
    </>
  )
}
