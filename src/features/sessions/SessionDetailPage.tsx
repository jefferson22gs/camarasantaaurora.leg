import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Clock, FileText, Gavel, ListChecks, MapPin, Pause, Play, ScrollText, Square, UserRound, Users, Vote, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, DescriptionList, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/page'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { AttendancePanel } from '@/features/attendance/AttendancePanel'
import { useAction, useAreaBase, useCollection, useLookups, usePermission } from '@/hooks/useData'
import { sessionLifecycle } from '@/services/plenaryService'
import { AgendaItemStatusMeta, SessionStatusMeta, SessionTypeLabel, VotingMethodLabel, VotingStatusMeta } from '@/domain/labels'
import { formatDate, formatDateLong, formatTime } from '@/lib/format'
import type { SessionStatus } from '@/types'
import { sessionTitle } from './utils'

export default function SessionDetailPage() {
  const { id = '' } = useParams()
  const base = useAreaBase()
  const can = usePermission()
  const lk = useLookups()
  const sessions = useCollection('sessions')
  const agendas = useCollection('agendas')
  const votings = useCollection('votings')
  const propositions = useCollection('propositions')
  const [confirm, setConfirm] = useState<'closed' | 'cancelled' | null>(null)

  const session = sessions.data?.find((s) => s.id === id)
  const agenda = agendas.data?.find((a) => a.sessionId === id)
  const items = useMemo(() => [...(agenda?.items ?? [])].sort((a, b) => a.order - b.order), [agenda])
  const sessionVotings = useMemo(() => (votings.data ?? []).filter((v) => v.sessionId === id).sort((a, b) => (a.openedAt ?? '').localeCompare(b.openedAt ?? '')), [votings.data, id])
  const propMap = useMemo(() => new Map((propositions.data ?? []).map((p) => [p.id, p])), [propositions.data])

  const setStatus = useAction((status: SessionStatus) => sessionLifecycle.setStatus(id, status), { success: 'Situação da sessão atualizada.' })

  if (sessions.isLoading) return <PageSkeleton />
  if (sessions.isError) return <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
  if (!session) return <EmptyState icon={CalendarDays} title="Sessão não encontrada" action={<Button asChild variant="outline"><Link to={`${base}/sessoes`}>Voltar às sessões</Link></Button>} />

  const canOperate = can('sessions', 'operate')
  const matterBase = base === '/vereador' ? '/vereador/materias' : '/admin/proposicoes'
  const orderOfDay = base === '/presidencia' ? '/presidencia/ordem-do-dia' : base === '/admin' && can('order_of_day') ? '/admin/ordem-do-dia' : null
  const s = session.status

  return (
    <>
      <PageHeader
        title={sessionTitle(session)}
        breadcrumb={[{ label: 'Início', to: base }, { label: 'Sessões', to: `${base}/sessoes` }, { label: `${SessionTypeLabel[session.type]} nº ${session.number}/${session.year}` }]}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`${base}/sessoes/${id}/ata`}>
                <ScrollText /> Ata
              </Link>
            </Button>
            {orderOfDay && (s === 'open' || s === 'in_progress') && (
              <Button variant="outline" asChild>
                <Link to={orderOfDay}>
                  <Gavel /> Ordem do Dia
                </Link>
              </Button>
            )}
            {canOperate && s === 'scheduled' && (
              <Button onClick={() => setStatus.run('open')} loading={setStatus.pending}>
                <Play /> Abrir sessão
              </Button>
            )}
            {canOperate && (s === 'open' || s === 'in_progress') && (
              <Button variant="warning" onClick={() => setStatus.run('suspended')} loading={setStatus.pending}>
                <Pause /> Suspender
              </Button>
            )}
            {canOperate && s === 'suspended' && (
              <Button onClick={() => setStatus.run('in_progress')} loading={setStatus.pending}>
                <Play /> Retomar
              </Button>
            )}
            {canOperate && (s === 'open' || s === 'in_progress' || s === 'suspended') && (
              <Button variant="destructive" onClick={() => setConfirm('closed')}>
                <Square /> Encerrar
              </Button>
            )}
            {canOperate && s === 'scheduled' && (
              <Button variant="outline" className="text-danger" onClick={() => setConfirm('cancelled')}>
                <XCircle /> Cancelar
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <StatusBadge meta={SessionStatusMeta[s]} />
          <span className="inline-flex items-center gap-1.5 capitalize">
            <CalendarDays className="size-4" aria-hidden /> {formatDateLong(session.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden /> {session.startTime}
            {session.endTime ? ` – ${session.endTime}` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden /> {session.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-4" aria-hidden /> Presidente: {lk.councilorName(session.presidentId)}
          </span>
        </div>
      </PageHeader>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            <FileText /> Resumo
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Users /> Presença
          </TabsTrigger>
          <TabsTrigger value="agenda">
            <ListChecks /> Pauta ({items.length})
          </TabsTrigger>
          <TabsTrigger value="votings">
            <Vote /> Votações ({sessionVotings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Expediente</CardTitle>
            </CardHeader>
            <CardContent>
              {session.expedient ? <p className="whitespace-pre-line text-sm leading-relaxed">{session.expedient}</p> : <p className="text-sm text-muted-foreground">Expediente não informado.</p>}
              {session.notes && (
                <div className="mt-5 rounded-lg bg-muted/60 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações</p>
                  {session.notes}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dados da sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                columns={1}
                items={[
                  { label: 'Tipo', value: SessionTypeLabel[session.type] },
                  { label: 'Número', value: `${session.number}/${session.year}` },
                  { label: 'Data', value: formatDate(session.date) },
                  { label: 'Abertura', value: session.openedAt ? formatTime(session.openedAt) : '—' },
                  { label: 'Encerramento', value: session.closedAt ? formatTime(session.closedAt) : '—' },
                  { label: 'Pauta', value: agenda ? (agenda.status === 'published' ? `Publicada em ${formatDate(agenda.publishedAt)}` : 'Rascunho') : 'Não elaborada' },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel session={session} />
        </TabsContent>

        <TabsContent value="agenda">
          <Card>
            {items.length === 0 ? (
              <EmptyState icon={ListChecks} title="Pauta sem itens" description="A pauta desta sessão ainda não foi elaborada." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH className="w-14">Item</TH>
                    <TH>Matéria</TH>
                    <TH className="hidden md:table-cell">Votação</TH>
                    <TH>Situação</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((i) => {
                    const p = propMap.get(i.propositionId)
                    return (
                      <TR key={i.id}>
                        <TD className="font-semibold tabular">{String(i.order).padStart(2, '0')}</TD>
                        <TD>
                          {p ? (
                            <>
                              <Link to={`${matterBase}/${p.id}`} className="font-medium hover:text-primary hover:underline">
                                {lk.title(p)}
                              </Link>
                              <p className="line-clamp-2 max-w-2xl text-xs text-muted-foreground">{p.summary}</p>
                            </>
                          ) : (
                            '—'
                          )}
                        </TD>
                        <TD className="hidden md:table-cell">
                          {VotingMethodLabel[i.votingMethod]}
                          <p className="text-xs text-muted-foreground">{lk.quorums.get(i.quorumRuleId)?.name}</p>
                        </TD>
                        <TD>
                          <StatusBadge meta={AgendaItemStatusMeta[i.status]} />
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="votings">
          <Card>
            {sessionVotings.length === 0 ? (
              <EmptyState icon={Vote} title="Nenhuma votação registrada" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Matéria</TH>
                    <TH className="hidden md:table-cell">Modalidade</TH>
                    <TH className="hidden sm:table-cell">Placar</TH>
                    <TH>Resultado</TH>
                  </TR>
                </THead>
                <TBody>
                  {sessionVotings.map((v) => {
                    const p = propMap.get(v.propositionId)
                    return (
                      <TR key={v.id}>
                        <TD>
                          <span className="font-medium">{p ? lk.code(p) : '—'}</span>
                          {v.round > 1 && <span className="ml-1 text-xs text-muted-foreground">({v.round}ª rodada)</span>}
                          <p className="text-xs text-muted-foreground tabular">
                            {formatTime(v.openedAt)} – {formatTime(v.closedAt)}
                          </p>
                        </TD>
                        <TD className="hidden md:table-cell">
                          {VotingMethodLabel[v.method]}
                          <p className="text-xs text-muted-foreground">{v.quorumRule.name}</p>
                        </TD>
                        <TD className="hidden tabular sm:table-cell">{v.result ? `${v.result.yes} SIM · ${v.result.no} NÃO · ${v.result.abstention} ABST.` : '—'}</TD>
                        <TD>{v.result && v.status === 'closed' ? <OutcomeSeal outcome={v.result.outcome} size="sm" /> : <StatusBadge meta={VotingStatusMeta[v.status]} />}</TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'closed' ? 'Encerrar sessão?' : 'Cancelar sessão?'}
        description={
          confirm === 'closed'
            ? 'A sessão será encerrada e não será possível registrar presença, alterar a pauta ou abrir votações.'
            : 'A sessão será marcada como cancelada. A operação será registrada na auditoria.'
        }
        confirmLabel={confirm === 'closed' ? 'Encerrar sessão' : 'Cancelar sessão'}
        cancelLabel="Voltar"
        onConfirm={() => confirm && setStatus.run(confirm)}
      />
    </>
  )
}
