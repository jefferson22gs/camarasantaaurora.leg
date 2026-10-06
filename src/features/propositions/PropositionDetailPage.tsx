import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, FileText, Minus, Pencil, Printer, Send, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, DescriptionList, StatusBadge, TBody, TD, TH, THead, TR, Table } from '@/components/ui/display'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Crest } from '@/components/common/Brand'
import { DocumentList, FileUpload, PageHeader } from '@/components/common/page'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states'
import { LegislativeTimeline } from '@/components/common/LegislativeTimeline'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { HorizontalStepper } from '@/features/legislative-process/ProcessStepper'
import { useAction, useAreaBase, useCollection, useLookups, useOrganization, usePermission, useSettings, type Lookups } from '@/hooks/useData'
import { buildLegislativeProcess } from '@/domain/legislative/process'
import {
  AuthorTypeLabel,
  BoardRoleLabel,
  CommitteeKindLabel,
  OpinionConclusionMeta,
  OpinionStatusMeta,
  PropositionStatusMeta,
  RegimeLabel,
  SessionTypeLabel,
  VoteChoiceMeta,
  VotingMethodLabel,
  VotingStatusMeta,
} from '@/domain/labels'
import { fileToDocumentRef, propositionService } from '@/services/propositionService'
import { formatDate, formatDateTime, formatDateTimeShort } from '@/lib/format'
import type { VoteChoice } from '@/types'
import { MoveDialog } from './MoveDialog'

const CHOICE_ICON: Record<VoteChoice, typeof Check> = { yes: Check, no: X, abstention: Minus }

export default function PropositionDetailPage() {
  const { id = '' } = useParams()
  const base = useAreaBase()
  const isCouncilorArea = base === '/vereador'
  const listPath = isCouncilorArea ? `${base}/materias` : '/admin/proposicoes'
  const navigate = useNavigate()
  const can = usePermission()
  const lk = useLookups()
  const { data: org } = useOrganization()
  const settings = useSettings()
  const propositionsQ = useCollection('propositions')
  const movementsQ = useCollection('movements')
  const opinionsQ = useCollection('opinions')
  const votingsQ = useCollection('votings')
  const votesQ = useCollection('votes')
  const sessionsQ = useCollection('sessions')
  const auditQ = useCollection('auditLogs')
  const [moveOpen, setMoveOpen] = useState(false)

  const p = propositionsQ.data?.find((x) => x.id === id)
  const canEdit = !isCouncilorArea && can('propositions', 'edit')
  const canDelete = !isCouncilorArea && can('propositions', 'delete')
  const canMove = !isCouncilorArea && (can('processes', 'operate') || can('processes', 'edit'))

  const movements = useMemo(() => (movementsQ.data ?? []).filter((m) => m.propositionId === id), [movementsQ.data, id])
  const process = useMemo(
    () => (p && settings.data ? buildLegislativeProcess(p, settings.data.processFlow, movements, settings.data.propositionTypes.find((t) => t.id === p.typeId)) : null),
    [p, settings.data, movements],
  )
  const opinions = (opinionsQ.data ?? []).filter((o) => o.propositionId === id)
  const amendments = (propositionsQ.data ?? []).filter((x) => x.parentId === id)
  const parent = p?.parentId ? propositionsQ.data?.find((x) => x.id === p.parentId) : undefined
  const votings = (votingsQ.data ?? []).filter((v) => v.propositionId === id).sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''))
  const history = (auditQ.data ?? []).filter((a) => a.recordId === id || (a.recordId && votings.some((v) => v.id === a.recordId))).sort((a, b) => b.at.localeCompare(a.at))

  const remove = useAction(propositionService.remove, { success: 'Proposição excluída.', onSuccess: () => navigate(listPath) })
  const addDocs = useAction(async (files: File[]) => {
    for (const f of files) await propositionService.addAttachment(id, fileToDocumentRef(f))
  }, { success: 'Documento anexado.' })
  const removeDoc = useAction((docId: string) => propositionService.removeAttachment(id, docId), { success: 'Documento removido.' })

  if (propositionsQ.isLoading || settings.isLoading) return <PageSkeleton />
  if (propositionsQ.isError) return <ErrorState error={propositionsQ.error} onRetry={() => propositionsQ.refetch()} />
  if (!p) return <EmptyState icon={FileText} title="Proposição não encontrada" description="O registro solicitado não existe ou foi excluído." action={<Button asChild><Link to={listPath}>Voltar à lista</Link></Button>} />

  const type = lk.types.get(p.typeId)
  const quorum = lk.quorums.get(p.quorumRuleId)
  const presentationSession = sessionsQ.data?.find((s) => s.id === p.presentationSessionId)
  const paragraphs = p.fullText.split(/\n{2,}/)

  return (
    <>
      {/* Cabeçalho institucional (impressão) */}
      <div className="print-only mb-6 border-b pb-4">
        <div className="flex items-center gap-3">
          <Crest org={org} className="size-12" />
          <div>
            <p className="font-semibold">{org?.name}</p>
            <p className="text-sm">
              {org?.city} — {org?.state}
            </p>
          </div>
        </div>
      </div>

      <PageHeader
        breadcrumb={[{ label: isCouncilorArea ? 'Portal do Vereador' : 'Administração', to: `${base}/dashboard` }, { label: isCouncilorArea ? 'Matérias' : 'Proposições', to: listPath }, { label: lk.code(p) }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {lk.title(p)}
            <StatusBadge meta={PropositionStatusMeta[p.status]} className="text-sm" />
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
            {canMove && (
              <Button variant="outline" onClick={() => setMoveOpen(true)}>
                <Send /> Tramitar
              </Button>
            )}
            {canEdit && (
              <Button asChild variant="outline">
                <Link to={`/admin/proposicoes/${p.id}/editar`}>
                  <Pencil /> Editar
                </Link>
              </Button>
            )}
            {canDelete && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline" className="text-danger hover:bg-danger-soft">
                    <Trash2 /> Excluir
                  </Button>
                }
                title="Excluir proposição?"
                description={`${lk.code(p)} e suas movimentações serão excluídas. Esta ação é registrada na auditoria e não pode ser desfeita.`}
                confirmLabel="Excluir"
                onConfirm={() => remove.run(p.id)}
              />
            )}
          </>
        }
      >
        <p className="max-w-4xl font-serif text-lg leading-relaxed text-foreground/90">{p.summary}</p>
        <p className="text-sm text-muted-foreground">
          {p.authorName} · Apresentada em {formatDate(p.presentedAt)} · Protocolo {p.protocolNumber}
        </p>
      </PageHeader>

      <Tabs defaultValue="overview">
        <TabsList className="no-print">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="text">Texto</TabsTrigger>
          <TabsTrigger value="authorship">Autoria</TabsTrigger>
          <TabsTrigger value="process">Tramitação</TabsTrigger>
          <TabsTrigger value="committees">Comissões</TabsTrigger>
          <TabsTrigger value="opinions">Pareceres {opinions.length > 0 && <Badge className="px-1.5 py-0">{opinions.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="amendments">Emendas {amendments.length > 0 && <Badge className="px-1.5 py-0">{amendments.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="votings">Votações</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          {!isCouncilorArea && <TabsTrigger value="history">Histórico</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {process && (
            <Card>
              <CardHeader>
                <CardTitle>Processo legislativo</CardTitle>
                <span className="text-sm text-muted-foreground">{Math.round(process.progress * 100)}% concluído</span>
              </CardHeader>
              <CardContent>
                <HorizontalStepper process={process} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <DescriptionList
                columns={3}
                items={[
                  { label: 'Tipo', value: type?.name },
                  { label: 'Número/Ano', value: `${String(p.number).padStart(3, '0')}/${p.year}` },
                  { label: 'Protocolo', value: p.protocolNumber },
                  { label: 'Autor', value: p.authorName },
                  { label: 'Data de apresentação', value: formatDate(p.presentedAt) },
                  { label: 'Sessão de apresentação', value: presentationSession ? `${SessionTypeLabel[presentationSession.type]} nº ${presentationSession.number}/${presentationSession.year}` : '—' },
                  { label: 'Assunto', value: p.subject || '—' },
                  { label: 'Regime de tramitação', value: RegimeLabel[p.regime] },
                  { label: 'Tipo de votação', value: VotingMethodLabel[p.votingMethod] },
                  { label: 'Quórum', value: quorum ? quorum.name : '—' },
                  { label: 'Comissões', value: p.committeeIds.map((c) => lk.committees.get(c)?.acronym).filter(Boolean).join(', ') || '—' },
                  { label: 'Relator', value: lk.councilorName(p.rapporteurId) },
                  ...(parent ? [{ label: 'Proposição principal', value: <Link className="text-primary hover:underline" to={`${listPath}/${parent.id}`}>{lk.title(parent)}</Link> }] : []),
                  { label: 'Observações', value: p.notes || '—', full: true },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Card className="print-plain">
            <CardContent className="mx-auto max-w-3xl py-8 sm:px-10">
              <p className="text-center font-serif text-lg font-semibold uppercase tracking-wide">{lk.title(p)}</p>
              <p className="mx-auto mt-4 max-w-xl text-justify font-serif text-[15px] italic leading-relaxed text-foreground/80 sm:ml-auto sm:mr-0 sm:w-1/2 sm:min-w-72">{p.summary}</p>
              <div className="prose-legal mt-8 text-justify font-serif text-[16px]">
                {paragraphs.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
              <p className="mt-10 text-center font-serif text-sm">
                {org?.city}, {formatDate(p.presentedAt)}.
              </p>
              <p className="mt-8 text-center font-serif font-semibold">{p.authorName}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authorship">
          <Card>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Autor · {AuthorTypeLabel[p.authorType]}</p>
                {p.authorId ? <CouncilorRow id={p.authorId} lk={lk} /> : <p className="font-medium">{p.authorName}</p>}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Coautores</p>
                {p.coauthorIds.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {p.coauthorIds.map((c) => (
                      <CouncilorRow key={c} id={c} lk={lk} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem coautores.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="process">
          <Card>
            <CardHeader>
              <CardTitle>Tramitação</CardTitle>
              {canMove && (
                <Button size="sm" onClick={() => setMoveOpen(true)}>
                  <Send /> Tramitar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <LegislativeTimeline movements={movements} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="committees">
          {p.committeeIds.length === 0 ? (
            <Card>
              <EmptyState title="Sem comissões vinculadas" description="Esta matéria não foi distribuída a comissões." />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {p.committeeIds.map((cid) => {
                const c = lk.committees.get(cid)
                const op = opinions.find((o) => o.committeeId === cid)
                return (
                  <Card key={cid} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{c?.acronym}</p>
                        <p className="text-sm text-muted-foreground">{c?.name}</p>
                      </div>
                      {c && <Badge>{CommitteeKindLabel[c.kind]}</Badge>}
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Presidente</dt>
                        <dd>{lk.councilorName(c?.presidentId)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Relator</dt>
                        <dd>{lk.councilorName(op?.rapporteurId ?? p.rapporteurId)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-muted-foreground">Parecer</dt>
                        <dd className="mt-1 flex flex-wrap gap-1.5">
                          {op ? <StatusBadge meta={OpinionStatusMeta[op.status]} /> : <Badge>Não iniciado</Badge>}
                          {op?.conclusion && <StatusBadge meta={OpinionConclusionMeta[op.conclusion]} />}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opinions" className="space-y-4">
          {opinions.length === 0 ? (
            <Card>
              <EmptyState title="Nenhum parecer" description="Os pareceres das comissões aparecerão aqui." />
            </Card>
          ) : (
            opinions.map((o) => (
              <Card key={o.id}>
                <CardHeader>
                  <div>
                    <CardTitle>
                      Parecer — {lk.committees.get(o.committeeId)?.acronym}
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Relator: {lk.councilorName(o.rapporteurId)} · {o.issuedAt ? `Emitido em ${formatDate(o.issuedAt)}` : `Prazo: ${formatDate(o.dueDate)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge meta={OpinionStatusMeta[o.status]} />
                    {o.conclusion && <StatusBadge meta={OpinionConclusionMeta[o.conclusion]} />}
                  </div>
                </CardHeader>
                {(o.report || o.reasoning) && (
                  <CardContent className="space-y-3 text-sm leading-relaxed">
                    {o.report && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relatório</p>
                        <p className="mt-1">{o.report}</p>
                      </div>
                    )}
                    {o.reasoning && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fundamentação</p>
                        <p className="mt-1">{o.reasoning}</p>
                      </div>
                    )}
                    {o.attachments.length > 0 && <DocumentList documents={o.attachments} />}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="amendments">
          <Card>
            {amendments.length === 0 ? (
              <EmptyState title="Nenhuma emenda ou matéria acessória" description="Emendas, substitutivos e vetos vinculados a esta proposição aparecerão aqui." />
            ) : (
              <ul className="divide-y">
                {amendments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Link to={`${listPath}/${a.id}`} className="font-semibold text-primary hover:underline">
                        {lk.title(a)}
                      </Link>
                      <p className="mt-1 text-sm">{a.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.authorName} · {formatDate(a.presentedAt)}
                      </p>
                    </div>
                    <StatusBadge meta={PropositionStatusMeta[a.status]} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="votings" className="space-y-4">
          {votings.length === 0 ? (
            <Card>
              <EmptyState title="Nenhuma votação registrada" description="As votações em Plenário desta matéria aparecerão aqui." />
            </Card>
          ) : (
            votings.map((v) => {
              const s = sessionsQ.data?.find((x) => x.id === v.sessionId)
              const votes = (votesQ.data ?? []).filter((x) => x.votingId === v.id)
              return (
                <Card key={v.id}>
                  <CardHeader>
                    <div>
                      <CardTitle>
                        {s ? `${SessionTypeLabel[s.type]} nº ${s.number}/${s.year}` : 'Sessão'} · {v.round}º turno
                      </CardTitle>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Votação {VotingMethodLabel[v.method].toLowerCase()} · {v.quorumRule.name} · {formatDateTimeShort(v.openedAt)}
                      </p>
                    </div>
                    {v.result ? <OutcomeSeal outcome={v.result.outcome} /> : <StatusBadge meta={VotingStatusMeta[v.status]} />}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {v.result && (
                      <>
                        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                          {[
                            ['SIM', v.result.yes, 'text-success'],
                            ['NÃO', v.result.no, 'text-danger'],
                            ['Abstenções', v.result.abstention, 'text-warning'],
                            ['Não votaram', v.result.notVoted, ''],
                            ['Presentes', v.result.present, ''],
                            ['Impedidos', v.result.impeded, ''],
                          ].map(([label, value, cls]) => (
                            <div key={label as string} className="rounded-lg border p-3 text-center">
                              <dt className="text-[11px] font-medium uppercase text-muted-foreground">{label}</dt>
                              <dd className={`mt-1 text-2xl font-bold tabular ${cls}`}>{value}</dd>
                            </div>
                          ))}
                        </dl>
                        <p className="text-sm text-muted-foreground">{v.result.explanation}</p>
                      </>
                    )}
                    {v.status === 'cancelled' && v.cancelReason && <p className="text-sm text-danger">Anulada: {v.cancelReason}</p>}
                    {v.method === 'nominal' && votes.length > 0 && (
                      <Table>
                        <THead>
                          <tr>
                            <TH>Vereador</TH>
                            <TH>Partido</TH>
                            <TH>Voto</TH>
                          </tr>
                        </THead>
                        <TBody>
                          {votes.map((vote) => {
                            const Icon = CHOICE_ICON[vote.choice]
                            return (
                              <TR key={vote.id}>
                                <TD>{lk.councilorName(vote.councilorId)}</TD>
                                <TD>{lk.partyOf(vote.councilorId ?? undefined)?.acronym ?? '—'}</TD>
                                <TD>
                                  <Badge tone={VoteChoiceMeta[vote.choice].tone}>
                                    <Icon aria-hidden /> {VoteChoiceMeta[vote.choice].label}
                                  </Badge>
                                </TD>
                              </TR>
                            )
                          })}
                        </TBody>
                      </Table>
                    )}
                    {v.method === 'secret' && <p className="text-sm text-muted-foreground">Votação secreta: os votos individuais não são associados aos vereadores.</p>}
                    {v.method === 'symbolic' && <p className="text-sm text-muted-foreground">Votação simbólica: resultado declarado pela Presidência.</p>}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="space-y-4">
              {canEdit && <FileUpload onFiles={(files) => files.length && addDocs.run(files)} />}
              <DocumentList documents={p.attachments} onRemove={canEdit ? (docId) => removeDoc.run(docId) : undefined} />
              {movements.some((m) => m.documents.length) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documentos da tramitação</p>
                  <DocumentList documents={movements.flatMap((m) => m.documents)} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {!isCouncilorArea && (
          <TabsContent value="history">
            <Card>
              {history.length === 0 ? (
                <EmptyState title="Sem registros de auditoria" />
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <TH>Data/Hora</TH>
                      <TH>Usuário</TH>
                      <TH>Operação</TH>
                      <TH>Detalhes</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {history.map((a) => (
                      <TR key={a.id}>
                        <TD className="whitespace-nowrap tabular">{formatDateTime(a.at)}</TD>
                        <TD className="whitespace-nowrap">{a.userName}</TD>
                        <TD className="whitespace-nowrap font-medium">{a.operation}</TD>
                        <TD className="min-w-64 text-muted-foreground">{a.details}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {canMove && <MoveDialog proposition={p} open={moveOpen} onOpenChange={setMoveOpen} />}
    </>
  )
}

function CouncilorRow({ id, lk }: { id: string; lk: Lookups }) {
  const c = lk.councilors.get(id)
  if (!c) return <p className="text-sm">—</p>
  const party = lk.parties.get(c.partyId)
  return (
    <div className="flex items-center gap-3">
      <Avatar name={c.parliamentaryName} src={c.photoUrl} color={party?.color} />
      <div>
        <p className="font-medium">{c.parliamentaryName}</p>
        <p className="text-xs text-muted-foreground">
          {party?.acronym}
          {c.boardRole && ` · ${BoardRoleLabel[c.boardRole]}`}
        </p>
      </div>
    </div>
  )
}
