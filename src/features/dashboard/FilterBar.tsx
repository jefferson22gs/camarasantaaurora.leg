import { FilterX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker, Field, NativeSelect } from '@/components/ui/form-controls'
import { PropositionStatusMeta } from '@/domain/labels'
import { useCollection, useLookups } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import type { PropositionStatus } from '@/types'
import { EMPTY_FILTERS, type DashboardFilters } from './useDashboardData'

type FilterKey = keyof DashboardFilters

/** Barra de filtros compartilhada entre Dashboard e Relatórios. */
export function FilterBar({ value, onChange, fields = ['from', 'to', 'legislatureId', 'councilorId', 'committeeId', 'typeId', 'status'], className }: { value: DashboardFilters; onChange: (f: DashboardFilters) => void; fields?: FilterKey[]; className?: string }) {
  const lk = useLookups()
  const { data: legislatures } = useCollection('legislatures')
  const set = <K extends FilterKey>(k: K, v: DashboardFilters[K]) => onChange({ ...value, [k]: v })
  const active = fields.some((f) => value[f])
  const show = (k: FilterKey) => fields.includes(k)

  return (
    <div className={cn('no-print grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8', className)}>
      {show('from') && <Field label="De">{(id) => <DatePicker id={id} value={value.from} max={value.to || undefined} onChange={(e) => set('from', e.target.value)} />}</Field>}
      {show('to') && <Field label="Até">{(id) => <DatePicker id={id} value={value.to} min={value.from || undefined} onChange={(e) => set('to', e.target.value)} />}</Field>}
      {show('legislatureId') && (
        <Field label="Legislatura">
          {(id) => (
            <NativeSelect id={id} value={value.legislatureId} onChange={(e) => set('legislatureId', e.target.value)}>
              <option value="">Todas</option>
              {(legislatures ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      {show('councilorId') && (
        <Field label="Vereador">
          {(id) => (
            <NativeSelect id={id} value={value.councilorId} onChange={(e) => set('councilorId', e.target.value)}>
              <option value="">Todos</option>
              {[...lk.councilors.values()]
                .sort((a, b) => a.parliamentaryName.localeCompare(b.parliamentaryName))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parliamentaryName}
                  </option>
                ))}
            </NativeSelect>
          )}
        </Field>
      )}
      {show('committeeId') && (
        <Field label="Comissão">
          {(id) => (
            <NativeSelect id={id} value={value.committeeId} onChange={(e) => set('committeeId', e.target.value)}>
              <option value="">Todas</option>
              {[...lk.committees.values()].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      {show('typeId') && (
        <Field label="Tipo">
          {(id) => (
            <NativeSelect id={id} value={value.typeId} onChange={(e) => set('typeId', e.target.value)}>
              <option value="">Todos</option>
              {[...lk.types.values()].map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      {show('status') && (
        <Field label="Situação">
          {(id) => (
            <NativeSelect id={id} value={value.status} onChange={(e) => set('status', e.target.value as PropositionStatus | '')}>
              <option value="">Todas</option>
              {(Object.keys(PropositionStatusMeta) as PropositionStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PropositionStatusMeta[s].label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      )}
      <div className="flex items-end">
        <Button variant="ghost" className="w-full" onClick={() => onChange(EMPTY_FILTERS)} disabled={!active}>
          <FilterX /> Limpar
        </Button>
      </div>
    </div>
  )
}
