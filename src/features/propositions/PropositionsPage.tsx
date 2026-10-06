import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, FilterX, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, StatusBadge, TBody, TD, TH, THead, TR, Table } from '@/components/ui/display'
import { NativeSelect } from '@/components/ui/form-controls'
import { EmptyState, QueryState } from '@/components/common/states'
import { PageHeader, Pagination, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { useAreaBase, useCollection, useLookups, usePermission } from '@/hooks/useData'
import { AuthorTypeLabel, PropositionStatusMeta } from '@/domain/labels'
import { downloadFile, toCsv } from '@/lib/csv'
import { formatDate } from '@/lib/format'
import { matches } from '@/lib/utils'
import type { Proposition, PropositionStatus } from '@/types'

export default function PropositionsPage() {
  const base = useAreaBase()
  const isCouncilorArea = base === '/vereador'
  const detailBase = isCouncilorArea ? `${base}/materias` : '/admin/proposicoes'
  const can = usePermission()
  const lk = useLookups()
  const query = useCollection('propositions')

  const [search, setSearch] = useState('')
  const [typeId, setTypeId] = useState('')
  const [status, setStatus] = useState<PropositionStatus | ''>('')
  const [author, setAuthor] = useState('')
  const [year, setYear] = useState('')
  const [committeeId, setCommitteeId] = useState('')

  const all = useMemo(() => [...(query.data ?? [])].sort((a, b) => b.presentedAt.localeCompare(a.presentedAt) || b.number - a.number), [query.data])
  const authors = useMemo(() => [...new Set(all.map((p) => p.authorName))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [all])
  const years = useMemo(() => [...new Set(all.map((p) => p.year))].sort((a, b) => b - a), [all])

  const filtered = useMemo(
    () =>
      all.filter(
        (p) =>
          (!typeId || p.typeId === typeId) &&
          (!status || p.status === status) &&
          (!author || p.authorName === author) &&
          (!year || p.year === Number(year)) &&
          (!committeeId || p.committeeIds.includes(committeeId)) &&
          matches([lk.code(p), lk.title(p), p.summary, p.authorName, p.subject, p.protocolNumber, `${p.number}/${p.year}`], search),
      ),
    [all, typeId, status, author, year, committeeId, search, lk],
  )
  const pagination = usePagination(filtered, 12)
  const hasFilters = !!(search || typeId || status || author || year || committeeId)

  function clearFilters() {
    setSearch('')
    setTypeId('')
    setStatus('')
    setAuthor('')
    setYear('')
    setCommitteeId('')
  }

  function exportCsv() {
    const csv = toCsv<Proposition>(
      [
        { header: 'Identificação', value: (p) => lk.code(p) },
        { header: 'Tipo', value: (p) => lk.types.get(p.typeId)?.name },
        { header: 'Ementa', value: (p) => p.summary },
        { header: 'Autor', value: (p) => p.authorName },
        { header: 'Tipo de autor', value: (p) => AuthorTypeLabel[p.authorType] },
        { header: 'Apresentação', value: (p) => formatDate(p.presentedAt) },
        { header: 'Assunto', value: (p) => p.subject },
        { header: 'Situação', value: (p) => PropositionStatusMeta[p.status].label },
        { header: 'Comissões', value: (p) => p.committeeIds.map((c) => lk.committees.get(c)?.acronym).join(', ') },
        { header: 'Protocolo', value: (p) => p.protocolNumber },
      ],
      filtered,
    )
    downloadFile(`proposicoes-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const selectClass = 'w-full sm:w-auto sm:min-w-36'

  return (
    <>
      <PageHeader
        title={isCouncilorArea ? 'Matérias legislativas' : 'Proposições'}
        description={isCouncilorArea ? 'Consulte as matérias em tramitação, seus textos, pareceres e votações.' : 'Cadastro, consulta e acompanhamento das proposições legislativas.'}
        breadcrumb={[{ label: isCouncilorArea ? 'Portal do Vereador' : 'Administração', to: `${base}/dashboard` }, { label: isCouncilorArea ? 'Matérias' : 'Proposições' }]}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
              <Download /> Exportar CSV
            </Button>
            {!isCouncilorArea && can('propositions', 'create') && (
              <Button asChild>
                <Link to="/admin/proposicoes/nova">
                  <Plus /> Nova proposição
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Número, ementa, autor, assunto, protocolo…" className="w-full sm:w-auto" />
          <NativeSelect aria-label="Filtrar por tipo" value={typeId} onChange={(e) => setTypeId(e.target.value)} className={selectClass}>
            <option value="">Todos os tipos</option>
            {[...lk.types.values()].map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Filtrar por situação" value={status} onChange={(e) => setStatus(e.target.value as PropositionStatus | '')} className={selectClass}>
            <option value="">Todas as situações</option>
            {Object.entries(PropositionStatusMeta).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Filtrar por autor" value={author} onChange={(e) => setAuthor(e.target.value)} className={selectClass}>
            <option value="">Todos os autores</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Filtrar por ano" value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
            <option value="">Todos os anos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Filtrar por comissão" value={committeeId} onChange={(e) => setCommitteeId(e.target.value)} className={selectClass}>
            <option value="">Todas as comissões</option>
            {[...lk.committees.values()].map((c) => (
              <option key={c.id} value={c.id}>
                {c.acronym}
              </option>
            ))}
          </NativeSelect>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <FilterX /> Limpar
            </Button>
          )}
        </Toolbar>

        <QueryState
          query={query}
          isEmpty={() => filtered.length === 0}
          empty={
            <EmptyState
              icon={FileText}
              title={hasFilters ? 'Nenhuma proposição encontrada' : 'Nenhuma proposição cadastrada'}
              description={hasFilters ? 'Ajuste ou limpe os filtros para ampliar a busca.' : 'As proposições cadastradas aparecerão aqui.'}
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {() => (
            <>
              {/* Desktop/tablet: tabela */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <tr>
                      <TH>Identificação</TH>
                      <TH>Ementa</TH>
                      <TH>Autor</TH>
                      <TH>Apresentação</TH>
                      <TH>Situação</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {pagination.slice.map((p) => (
                      <TR key={p.id}>
                        <TD className="whitespace-nowrap">
                          <Link to={`${detailBase}/${p.id}`} className="font-semibold text-primary hover:underline">
                            {lk.code(p)}
                          </Link>
                          <p className="text-xs text-muted-foreground">{lk.types.get(p.typeId)?.name}</p>
                        </TD>
                        <TD className="max-w-xl">
                          <p className="line-clamp-2">{p.summary}</p>
                          {p.subject && <p className="mt-0.5 text-xs text-muted-foreground">{p.subject}</p>}
                        </TD>
                        <TD className="max-w-48">
                          <p className="truncate">{p.authorName}</p>
                          <p className="text-xs text-muted-foreground">{AuthorTypeLabel[p.authorType]}</p>
                        </TD>
                        <TD className="whitespace-nowrap tabular">{formatDate(p.presentedAt)}</TD>
                        <TD>
                          <StatusBadge meta={PropositionStatusMeta[p.status]} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              {/* Mobile: cards */}
              <ul className="divide-y md:hidden">
                {pagination.slice.map((p) => (
                  <li key={p.id}>
                    <Link to={`${detailBase}/${p.id}`} className="block p-4 hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-primary">{lk.code(p)}</span>
                        <StatusBadge meta={PropositionStatusMeta[p.status]} />
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-sm">{p.summary}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {p.authorName} · {formatDate(p.presentedAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination {...pagination} />
            </>
          )}
        </QueryState>
      </Card>
    </>
  )
}
