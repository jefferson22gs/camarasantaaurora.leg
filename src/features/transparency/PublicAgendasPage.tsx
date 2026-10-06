import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { Card, CardHeader, CardTitle, StatusBadge } from '@/components/ui/display'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection, useLookups } from '@/hooks/useData'
import { AgendaItemStatusMeta, VotingMethodLabel } from '@/domain/labels'
import { formatDateLong, formatDateTimeShort } from '@/lib/format'
import { PUBLIC_BASE, PublicContainer, PublicPageHeader, sessionTitle, useIndex } from './shared'

export default function PublicAgendasPage() {
  const agendas = useCollection('agendas')
  const sessions = useCollection('sessions')
  const propositions = useCollection('propositions')
  const lk = useLookups()
  const sessionIndex = useIndex(sessions.data)
  const propIndex = useIndex(propositions.data)

  const published = useMemo(
    () =>
      (agendas.data ?? [])
        .filter((a) => a.status === 'published' && sessionIndex.has(a.sessionId))
        .sort((a, b) => (sessionIndex.get(b.sessionId)?.date ?? '').localeCompare(sessionIndex.get(a.sessionId)?.date ?? '')),
    [agendas.data, sessionIndex],
  )

  return (
    <PublicContainer>
      <PublicPageHeader title="Pautas" crumbs={[{ label: 'Pautas' }]} description="Pautas publicadas das sessões plenárias, com as matérias submetidas à apreciação." />
      <QueryState query={agendas} isEmpty={() => published.length === 0} empty={<Card><EmptyState icon={ClipboardList} title="Nenhuma pauta publicada" /></Card>}>
        {() => (
          <div className="space-y-6">
            {published.map((a) => {
              const s = sessionIndex.get(a.sessionId)!
              return (
                <Card key={a.id}>
                  <CardHeader>
                    <div>
                      <CardTitle>
                        <Link to={`${PUBLIC_BASE}/sessoes/${s.id}`} className="hover:text-primary hover:underline">
                          Pauta — {sessionTitle(s)}
                        </Link>
                      </CardTitle>
                      <p className="mt-1 text-sm capitalize text-muted-foreground">
                        {formatDateLong(s.date)} · {s.startTime}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Publicada em {formatDateTimeShort(a.publishedAt)}</p>
                  </CardHeader>
                  <ol className="divide-y">
                    {[...a.items]
                      .sort((x, y) => x.order - y.order)
                      .map((i) => {
                        const p = propIndex.get(i.propositionId)
                        return (
                          <li key={i.id} className="flex gap-4 px-5 py-4">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{String(i.order).padStart(2, '0')}</span>
                            <div className="min-w-0 flex-1">
                              {p ? (
                                <Link to={`${PUBLIC_BASE}/proposicoes/${p.id}`} className="font-medium text-primary hover:underline">
                                  {lk.title(p)}
                                </Link>
                              ) : (
                                <span className="font-medium">Matéria</span>
                              )}
                              {p && <p className="mt-1 text-sm text-foreground/80">{p.summary}</p>}
                              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {p && <span>Autoria: {p.authorName}</span>}
                                <span>Votação: {VotingMethodLabel[i.votingMethod]}</span>
                                <span>Quórum: {lk.quorums.get(i.quorumRuleId)?.name}</span>
                                <StatusBadge meta={AgendaItemStatusMeta[i.status]} />
                              </p>
                            </div>
                          </li>
                        )
                      })}
                  </ol>
                </Card>
              )
            })}
          </div>
        )}
      </QueryState>
    </PublicContainer>
  )
}
