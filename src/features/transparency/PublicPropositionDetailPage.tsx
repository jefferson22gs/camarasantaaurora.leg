import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileCheck2, FileText, Printer, Vote, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardContent, CardHeader, CardTitle, DescriptionList, StatusBadge } from '@/components/ui/display'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { DocumentList } from '@/components/common/page'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { LegislativeTimeline } from '@/components/common/LegislativeTimeline'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { useCollection, useLookups, useSettings } from '@/hooks/useData'
import { AuthorTypeLabel, OpinionConclusionMeta, OpinionStatusMeta, RegimeLabel, VotingMethodLabel } from '@/domain/labels'
import { PropositionStatusMeta } from '@/domain/labels'
import { formatDate } from '@/lib/format'
import { PUBLIC_BASE, PublicContainer, PublicNotFound, PublicPageHeader, ScoreLine, sessionTitle, useIndex, usePublicPropositions, usePublicVotings } from './shared'

export default function PublicPropositionDetailPage() {
  const { id } = useParams()
  const props = usePublicPropositions()
  const lk = useLookups()
  const { data: settings } = useSettings()
  const movements = useCollection('movements')
  const opinions = useCollection('opinions')
  const sessions = useCollection('sessions')
  const votings = usePublicVotings()
  const sessionIndex = useIndex(sessions.data)

  const p = props.data?.find((x) => x.id === id)
  const myMovements = useMemo(() => (movements.data ?? []).filter((m) => m.propositionId === id), [movements.data, id])
  const myOpinions = useMemo(() => (opinions.data ?? []).filter((o) => o.propositionId === id && o.status === 'completed'), [opinions.data, id])
  const myVotings = useMemo(() => (votings.data ?? []).filter((v) => v.propositionId === id), [votings.data, id])
  const related = useMemo(() => (props.data ?? []).filter((x) => x.parentId === id || x.id === p?.parentId), [props.data, id, p?.parentId])

  if (props.isLoading || !lk.ready) return <PublicContainer><PageSkeleton /></PublicContainer>
  if (!p) return <PublicNotFound title="Proposição não encontrada" backTo={`${PUBLIC_BASE}/proposicoes`} backLabel="Voltar às proposições" />

  const publishOpinions = settings?.transparency.publishOpinions ?? true
  const coauthors = p.coauthorIds.map((c) => lk.councilorName(c)).join(', ')

  return (
    <PublicContainer>
      <PublicPageHeader
        title={lk.title(p)}
        crumbs={[{ label: 'Proposições', to: `${PUBLIC_BASE}/proposicoes` }, { label: lk.code(p) }]}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge meta={PropositionStatusMeta[p.status]} />
            <Badge>Protocolo {p.protocolNumber}</Badge>
            <span className="text-sm">Apresentada em {formatDate(p.presentedAt)}</span>
          </div>
        }
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
        }
      />

      <Card className="mb-6 border-l-4 border-l-primary">
        <CardContent>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ementa</p>
          <p className="mt-2 font-serif text-lg leading-relaxed">{p.summary}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="geral">
        <TabsList aria-label="Seções da proposição" className="no-print">
          <TabsTrigger value="geral">
            <FileText /> Visão geral
          </TabsTrigger>
          <TabsTrigger value="texto">Texto</TabsTrigger>
          <TabsTrigger value="tramitacao">
            <Workflow /> Tramitação
          </TabsTrigger>
          {publishOpinions && (
            <TabsTrigger value="pareceres">
              <FileCheck2 /> Pareceres ({myOpinions.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="votacoes">
            <Vote /> Votações ({myVotings.length})
          </TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({p.attachments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Dados da proposição</CardTitle>
              </CardHeader>
              <CardContent>
                <DescriptionList
                  items={[
                    { label: 'Tipo', value: lk.types.get(p.typeId)?.name },
                    { label: 'Número/Ano', value: `${String(p.number).padStart(3, '0')}/${p.year}` },
                    { label: 'Autoria', value: `${p.authorName} (${AuthorTypeLabel[p.authorType]})` },
                    { label: 'Coautoria', value: coauthors || '—' },
                    { label: 'Assunto', value: p.subject },
                    { label: 'Regime de tramitação', value: RegimeLabel[p.regime] },
                    { label: 'Tipo de votação', value: VotingMethodLabel[p.votingMethod] },
                    { label: 'Quórum', value: lk.quorums.get(p.quorumRuleId)?.name },
                    { label: 'Comissões', value: p.committeeIds.map((c) => lk.committees.get(c)?.acronym).filter(Boolean).join(', ') || '—' },
                    { label: 'Relator(a)', value: lk.councilorName(p.rapporteurId) },
                  ]}
                />
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Última movimentação</CardTitle>
                </CardHeader>
                <CardContent>
                  <LegislativeTimeline movements={[...myMovements].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 1)} showResponsible={false} />
                </CardContent>
              </Card>
              {related.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Matérias relacionadas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {related.map((r) => (
                      <Link key={r.id} to={`${PUBLIC_BASE}/proposicoes/${r.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted/40">
                        <span className="font-medium text-primary">{lk.title(r)}</span>
                        <span className="mt-1 line-clamp-2 block text-muted-foreground">{r.summary}</span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="texto">
          <Card>
            <CardContent className="mx-auto max-w-3xl py-8">
              <p className="text-center font-serif text-lg font-semibold uppercase">{lk.title(p)}</p>
              <p className="mx-auto mt-4 max-w-xl text-right font-serif text-sm italic text-muted-foreground">{p.summary}</p>
              <div className="prose-legal mt-8 font-serif text-[15px]">
                {p.fullText.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tramitacao">
          <Card>
            <CardContent>
              <LegislativeTimeline movements={myMovements} showResponsible={false} />
            </CardContent>
          </Card>
        </TabsContent>

        {publishOpinions && (
          <TabsContent value="pareceres">
            {myOpinions.length === 0 ? (
              <Card>
                <EmptyState icon={FileCheck2} title="Nenhum parecer concluído" description="Os pareceres são publicados após a conclusão pela comissão." />
              </Card>
            ) : (
              <div className="space-y-4">
                {myOpinions.map((o) => (
                  <Card key={o.id}>
                    <CardHeader>
                      <div>
                        <CardTitle>{lk.committees.get(o.committeeId)?.name ?? 'Comissão'}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Relator(a): {lk.councilorName(o.rapporteurId)} · Emitido em {formatDate(o.issuedAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge meta={OpinionStatusMeta[o.status]} />
                        {o.conclusion && <StatusBadge meta={OpinionConclusionMeta[o.conclusion]} />}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm leading-relaxed">
                      {o.report && (
                        <section>
                          <h3 className="font-semibold">Relatório</h3>
                          <p className="mt-1 text-foreground/85">{o.report}</p>
                        </section>
                      )}
                      {o.reasoning && (
                        <section>
                          <h3 className="font-semibold">Fundamentação</h3>
                          <p className="mt-1 text-foreground/85">{o.reasoning}</p>
                        </section>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="votacoes">
          {myVotings.length === 0 ? (
            <Card>
              <EmptyState icon={Vote} title="Nenhuma votação registrada" description="A matéria ainda não foi apreciada em Plenário." />
            </Card>
          ) : (
            <ul className="space-y-3">
              {myVotings.map((v) => {
                const s = sessionIndex.get(v.sessionId)
                return (
                  <li key={v.id}>
                    <Link to={`${PUBLIC_BASE}/votacoes/${v.id}`} className="flex flex-col gap-3 rounded-xl border bg-card p-4 hover:bg-muted/30 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <p className="font-medium">{s ? sessionTitle(s) : 'Sessão'}</p>
                        <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                          <span>
                            Votação {VotingMethodLabel[v.method].toLowerCase()} · {v.round}º turno
                          </span>
                          <span>{formatDate(v.closedAt)}</span>
                          <ScoreLine r={v.result} />
                        </p>
                      </div>
                      <OutcomeSeal outcome={v.result.outcome} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardContent>
              <DocumentList documents={p.attachments} />
              <p className="mt-3 text-xs text-muted-foreground">Nesta fase de demonstração os arquivos são simulados (somente metadados).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PublicContainer>
  )
}
