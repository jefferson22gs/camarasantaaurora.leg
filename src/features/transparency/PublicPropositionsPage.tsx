import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/display'
import { Field, NativeSelect } from '@/components/ui/form-controls'
import { FilterChip, Pagination, SearchInput, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useLookups } from '@/hooks/useData'
import { PropositionStatusMeta } from '@/domain/labels'
import { matches } from '@/lib/utils'
import { formatNumber } from '@/lib/format'
import type { PropositionStatus } from '@/types'
import { CATEGORIES, inCategory, isCategory, PropositionListItem, PublicContainer, PublicPageHeader, usePublicPropositions, type PublicCategory } from './shared'

export default function PublicPropositionsPage() {
  const [params, setParams] = useSearchParams()
  const query = usePublicPropositions()
  const lk = useLookups()
  const q = params.get('q') ?? ''
  const typeId = params.get('tipo') ?? ''
  const status = params.get('situacao') ?? ''
  const year = params.get('ano') ?? ''
  const rawCat = params.get('categoria')
  const category = isCategory(rawCat) ? rawCat : null

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const years = useMemo(() => [...new Set((query.data ?? []).map((p) => p.year))].sort((a, b) => b - a), [query.data])
  const types = useMemo(() => [...lk.types.values()].filter((t) => t.active), [lk.types])

  const filtered = useMemo(
    () =>
      (query.data ?? []).filter(
        (p) =>
          (!typeId || p.typeId === typeId) &&
          (!status || p.status === status) &&
          (!year || String(p.year) === year) &&
          (!category || inCategory(p, lk.types.get(p.typeId), category)) &&
          matches([lk.code(p), lk.title(p), p.summary, p.authorName, p.subject, p.protocolNumber, `${p.number}/${p.year}`], q),
      ),
    [query.data, typeId, status, year, category, q, lk],
  )
  const pagination = usePagination(filtered, 10)
  const hasFilters = !!(q || typeId || status || year || category)

  return (
    <PublicContainer>
      <PublicPageHeader
        title="Proposições"
        crumbs={[{ label: 'Proposições' }]}
        description="Projetos de lei, resoluções, decretos legislativos, requerimentos, indicações, moções e demais matérias em tramitação ou concluídas."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtro rápido por categoria">
        <Button size="sm" variant={!category ? 'default' : 'outline'} onClick={() => set('categoria', '')} aria-pressed={!category}>
          Todas
        </Button>
        {(Object.keys(CATEGORIES) as PublicCategory[]).map((c) => (
          <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => set('categoria', c)} aria-pressed={category === c}>
            {CATEGORIES[c].label}
          </Button>
        ))}
      </div>

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_0.7fr]">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium leading-none" aria-hidden>
              Busca
            </span>
            <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Número, ementa, autor, assunto…" className="sm:max-w-none" />
          </div>
          <Field label="Tipo">
            {(id) => (
              <NativeSelect id={id} value={typeId} onChange={(e) => set('tipo', e.target.value)}>
                <option value="">Todos os tipos</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Situação">
            {(id) => (
              <NativeSelect id={id} value={status} onChange={(e) => set('situacao', e.target.value)}>
                <option value="">Todas</option>
                {(Object.keys(PropositionStatusMeta) as PropositionStatus[])
                  .filter((s) => s !== 'draft')
                  .map((s) => (
                    <option key={s} value={s}>
                      {PropositionStatusMeta[s].label}
                    </option>
                  ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Ano">
            {(id) => (
              <NativeSelect id={id} value={year} onChange={(e) => set('ano', e.target.value)}>
                <option value="">Todos</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        </div>
        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {q && <FilterChip label={`“${q}”`} onClear={() => set('q', '')} />}
            {category && <FilterChip label={CATEGORIES[category].label} onClear={() => set('categoria', '')} />}
            {typeId && <FilterChip label={lk.types.get(typeId)?.name ?? typeId} onClear={() => set('tipo', '')} />}
            {status && <FilterChip label={PropositionStatusMeta[status as PropositionStatus]?.label ?? status} onClear={() => set('situacao', '')} />}
            {year && <FilterChip label={year} onClear={() => set('ano', '')} />}
            <Button variant="link" size="sm" onClick={() => setParams({}, { replace: true })}>
              Limpar filtros
            </Button>
          </div>
        )}
      </Card>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {formatNumber(filtered.length)} {filtered.length === 1 ? 'proposição encontrada' : 'proposições encontradas'}
      </p>

      <QueryState query={query}>
        {() =>
          filtered.length === 0 ? (
            <Card>
              <EmptyState icon={FileSearch} title="Nenhuma proposição encontrada" description="Revise os filtros ou utilize outros termos de busca." />
            </Card>
          ) : (
            <>
              <ul className="space-y-3">
                {pagination.slice.map((p) => (
                  <PropositionListItem key={p.id} p={p} lk={lk} />
                ))}
              </ul>
              <Card className="mt-4">
                <Pagination {...pagination} />
              </Card>
            </>
          )
        }
      </QueryState>
    </PublicContainer>
  )
}
