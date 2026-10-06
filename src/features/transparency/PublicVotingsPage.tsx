import { useMemo, useState } from 'react'
import { Vote } from 'lucide-react'
import { Card } from '@/components/ui/display'
import { NativeSelect } from '@/components/ui/form-controls'
import { Pagination, SearchInput, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection, useLookups } from '@/hooks/useData'
import { OUTCOME_LABEL } from '@/domain/voting/votingEngine'
import { VotingMethodLabel } from '@/domain/labels'
import { matches } from '@/lib/utils'
import type { VotingMethod, VotingOutcome } from '@/types'
import { PublicContainer, PublicPageHeader, sessionTitle, useIndex, usePublicVotings, VotingListItem } from './shared'

export default function PublicVotingsPage() {
  const query = usePublicVotings()
  const propositions = useCollection('propositions')
  const sessions = useCollection('sessions')
  const lk = useLookups()
  const propIndex = useIndex(propositions.data)
  const sessionIndex = useIndex(sessions.data)
  const [q, setQ] = useState('')
  const [outcome, setOutcome] = useState('')
  const [method, setMethod] = useState('')

  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((v) => {
        const p = propIndex.get(v.propositionId)
        const s = sessionIndex.get(v.sessionId)
        return (!outcome || v.result.outcome === outcome) && (!method || v.method === method) && matches([p && lk.title(p), p && lk.code(p), p?.summary, s && sessionTitle(s)], q)
      }),
    [query.data, propIndex, sessionIndex, outcome, method, q, lk],
  )
  const pagination = usePagination(filtered, 10)

  return (
    <PublicContainer>
      <PublicPageHeader title="Votações" crumbs={[{ label: 'Votações' }]} description="Resultado das votações realizadas em Plenário, com placar e, quando públicos, os votos nominais." />

      <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <SearchInput value={q} onChange={setQ} placeholder="Matéria, ementa ou sessão…" />
        <label className="grid gap-1.5 text-sm font-medium">
          Resultado
          <NativeSelect value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-44">
            <option value="">Todos</option>
            {(Object.keys(OUTCOME_LABEL) as VotingOutcome[]).map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABEL[o]}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Modalidade
          <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)} className="w-40">
            <option value="">Todas</option>
            {(Object.keys(VotingMethodLabel) as VotingMethod[]).map((m) => (
              <option key={m} value={m}>
                {VotingMethodLabel[m]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </Card>

      <QueryState query={query}>
        {() =>
          filtered.length === 0 ? (
            <Card>
              <EmptyState icon={Vote} title="Nenhuma votação encontrada" />
            </Card>
          ) : (
            <>
              <ul className="space-y-3">
                {pagination.slice.map((v) => (
                  <VotingListItem key={v.id} v={v} p={propIndex.get(v.propositionId)} s={sessionIndex.get(v.sessionId)} lk={lk} />
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
