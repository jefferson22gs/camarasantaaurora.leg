import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCheck2 } from 'lucide-react'
import { Card, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { NativeSelect } from '@/components/ui/form-controls'
import { Pagination, SearchInput, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection, useLookups, useSettings } from '@/hooks/useData'
import { OpinionConclusionMeta } from '@/domain/labels'
import { formatDate } from '@/lib/format'
import { matches } from '@/lib/utils'
import { PUBLIC_BASE, PublicContainer, PublicPageHeader, useIndex } from './shared'

export default function PublicOpinionsPage() {
  const opinions = useCollection('opinions')
  const propositions = useCollection('propositions')
  const { data: settings } = useSettings()
  const lk = useLookups()
  const propIndex = useIndex(propositions.data)
  const [q, setQ] = useState('')
  const [committee, setCommittee] = useState('')

  const rows = useMemo(
    () =>
      (opinions.data ?? [])
        .filter((o) => o.status === 'completed')
        .filter((o) => {
          const p = propIndex.get(o.propositionId)
          return p && p.status !== 'draft' && (!committee || o.committeeId === committee) && matches([lk.code(p), lk.title(p), p.summary, lk.councilorName(o.rapporteurId)], q)
        })
        .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? '')),
    [opinions.data, propIndex, committee, q, lk],
  )
  const pagination = usePagination(rows, 12)

  if (settings && !settings.transparency.publishOpinions)
    return (
      <PublicContainer>
        <PublicPageHeader title="Pareceres" crumbs={[{ label: 'Pareceres' }]} />
        <Card>
          <EmptyState icon={FileCheck2} title="Pareceres não publicados" description="A publicação de pareceres está desabilitada pela Câmara." />
        </Card>
      </PublicContainer>
    )

  return (
    <PublicContainer>
      <PublicPageHeader title="Pareceres" crumbs={[{ label: 'Pareceres' }]} description="Pareceres concluídos pelas comissões permanentes e temporárias." />
      <Card>
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Matéria, ementa ou relator…" />
          <label className="grid gap-1.5 text-sm font-medium">
            Comissão
            <NativeSelect value={committee} onChange={(e) => setCommittee(e.target.value)} className="w-56">
              <option value="">Todas</option>
              {[...lk.committees.values()].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym} — {c.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        <QueryState query={opinions} isEmpty={() => rows.length === 0} empty={<EmptyState icon={FileCheck2} title="Nenhum parecer encontrado" />}>
          {() => (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Matéria</TH>
                    <TH>Comissão</TH>
                    <TH>Relator(a)</TH>
                    <TH>Emissão</TH>
                    <TH>Conclusão</TH>
                  </TR>
                </THead>
                <TBody>
                  {pagination.slice.map((o) => {
                    const p = propIndex.get(o.propositionId)!
                    return (
                      <TR key={o.id}>
                        <TD className="min-w-64">
                          <Link to={`${PUBLIC_BASE}/proposicoes/${p.id}`} className="font-medium text-primary hover:underline">
                            {lk.code(p)}
                          </Link>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{p.summary}</p>
                        </TD>
                        <TD>{lk.committees.get(o.committeeId)?.acronym}</TD>
                        <TD className="whitespace-nowrap">{lk.councilorName(o.rapporteurId)}</TD>
                        <TD className="tabular">{formatDate(o.issuedAt)}</TD>
                        <TD>{o.conclusion ? <StatusBadge meta={OpinionConclusionMeta[o.conclusion]} /> : '—'}</TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </QueryState>
      </Card>
    </PublicContainer>
  )
}
