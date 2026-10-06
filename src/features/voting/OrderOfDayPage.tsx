import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  CircleStop,
  FileText,
  Gavel,
  ListOrdered,
  MessageSquare,
  MessageSquareOff,
  Monitor,
  Play,
  RotateCcw,
  SkipForward,
  Undo2,
  Users,
  Vote as VoteIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Badge, Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@/components/ui/display'
import { Field, Input, NativeSelect, SwitchField } from '@/components/ui/form-controls'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states'
import { PageHeader } from '@/components/common/page'
import { OutcomeSeal, VotingSummary } from '@/components/common/VotingSummary'
import { AgendaItemStatusMeta, OpinionConclusionMeta, QuorumTypeLabel, SessionStatusMeta, SessionTypeLabel, VotingMethodLabel, VotingStatusMeta } from '@/domain/labels'
import { describeQuorumRule } from '@/domain/quorum/quorumEngine'
import { getRemainingSeconds, needsTiebreak, OUTCOME_LABEL } from '@/domain/voting/votingEngine'
import { useAction, useAreaBase, useCollection, useLookups, useNow, usePermission } from '@/hooks/useData'
import { orderOfDayService, sessionLifecycle, votingService } from '@/services/plenaryService'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AgendaItem, VoteChoice } from '@/types'
import { Countdown } from './Countdown'
import { ImpedimentDialog } from './ImpedimentDialog'
import { NominalTable, VotingCounters } from './LiveVotingBoard'
import { pickLiveSession, useLiveSession } from './useLiveSession'

/**
 * Ordem do Dia / Mesa Diretora — interface operacional do Presidente.
 * Todas as ações passam pelo plenaryService; regras de votação ficam no VotingEngine.
 */
export default function OrderOfDayPage() {
  const sessions = useCollection('sessions')
  const [selectedId, setSelectedId] = useState<string>()
  const defaultId = useMemo(() => pickLiveSession(sessions.data ?? [])?.id, [sessions.data])
  const live = useLiveSession(selectedId ?? defaultId)
  const lk = useLookups()
  const can = usePermission()
  const base = useAreaBase()
  const canOperate = can('order_of_day', 'operate') || can('voting', 'operate')
  const opinions = useCollection('opinions')

  const [startOpen, setStartOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [tiebreakOpen, setTiebreakOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)

  const { session, currentItem, voting, openVoting, tally, proposition, settings } = live
  const sessionId = session?.id ?? ''

  const startItem = useAction(orderOfDayService.startItem, { success: 'Item iniciado.' })
  const openDisc = useAction(orderOfDayService.openDiscussion, { success: 'Discussão aberta.' })
  const closeDisc = useAction(orderOfDayService.closeDiscussion, { success: 'Discussão encerrada.' })
  const next = useAction(orderOfDayService.nextItem, { success: (id) => (id ? 'Próximo item iniciado.' : 'Não há mais itens pendentes na pauta.') })
  const outcome = useAction(orderOfDayService.setItemOutcome, { success: 'Situação do item atualizada.' })
  const close = useAction(votingService.close, { success: (v) => `Votação encerrada: ${v.result ? OUTCOME_LABEL[v.result.outcome] : ''}` })
  const cancel = useAction(votingService.cancel, { success: 'Votação anulada.' })
  const reopen = useAction(votingService.reopen, { success: 'Votação reaberta.' })
  const openSession = useAction(sessionLifecycle.setStatus, { success: 'Sessão atualizada.' })

  // Encerramento automático ao zerar o cronômetro (quando configurado).
  const now = useNow(1000)
  const autoClosing = useRef<string | null>(null)
  useEffect(() => {
    if (!openVoting || !openVoting.automaticClose || !canOperate) return
    if (getRemainingSeconds(openVoting, now) > 0 || autoClosing.current === openVoting.id) return
    autoClosing.current = openVoting.id
    void close.run(openVoting.id, { automatic: true })
  }, [now, openVoting, canOperate, close])

  if (live.isLoading || sessions.isLoading) return <PageSkeleton />
  if (live.isError) return <ErrorState />

  const header = (
    <PageHeader
      title="Ordem do Dia"
      description="Condução da sessão plenária: itens, discussão e votação eletrônica."
      breadcrumb={[{ label: base === '/presidencia' ? 'Presidência' : 'Administração', to: `${base}/dashboard` }, { label: 'Ordem do Dia' }]}
      actions={
        <>
          <NativeSelect aria-label="Selecionar sessão" value={sessionId} onChange={(e) => setSelectedId(e.target.value)} className="w-64 max-w-full">
            {[...(sessions.data ?? [])]
              .filter((s) => s.status !== 'cancelled')
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {SessionTypeLabel[s.type]} nº {s.number}/{s.year} — {formatDate(s.date)}
                </option>
              ))}
          </NativeSelect>
          <Button variant="outline" asChild>
            <a href="/plenario" target="_blank" rel="noopener">
              <Monitor /> Abrir painel
            </a>
          </Button>
        </>
      }
    />
  )

  if (!session) return <>{header}<Card><EmptyState icon={Gavel} title="Nenhuma sessão disponível" description="Cadastre ou agende uma sessão plenária." /></Card></>

  const sessionClosed = session.status === 'closed' || session.status === 'cancelled'
  const sessionNotOpen = session.status === 'scheduled'
  const labels = settings?.voting.labels ?? { yes: 'SIM', no: 'NÃO', abstention: 'ABSTENÇÃO' }
  const itemOpinions = (opinions.data ?? []).filter((o) => o.propositionId === currentItem?.propositionId && o.conclusion)
  const quorumRule = currentItem ? lk.quorums.get(currentItem.quorumRuleId) : undefined
  const st = currentItem?.status
  const votingOpen = !!openVoting
  const busy = startItem.pending || openDisc.pending || closeDisc.pending || next.pending || close.pending

  function requestClose() {
    if (!openVoting || !settings || !tally) return
    const tie = needsTiebreak({ rule: openVoting.quorumRule, tally, presidentRule: settings.presidentRule, deliberationQuorum: settings.voting.deliberationQuorum, tieOutcome: settings.voting.tieOutcome })
    if (tie) setTiebreakOpen(true)
    else setCloseOpen(true)
  }

  return (
    <div className="space-y-5">
      {header}

      {/* Faixa da sessão */}
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sessão atual</p>
          <p className="font-semibold">
            {SessionTypeLabel[session.type]} nº {session.number}/{session.year} · {formatDate(session.date)} às {session.startTime}
          </p>
        </div>
        <StatusBadge meta={SessionStatusMeta[session.status]} />
        <div className="flex items-center gap-2 text-sm">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          <span className="tabular">
            <strong>{live.presentIds.length}</strong> presentes de {live.members.length} · quórum mínimo {live.requiredPresence}
          </span>
          <Badge tone={live.hasQuorum ? 'success' : 'danger'} dot>
            {live.hasQuorum ? 'Quórum atingido' : 'Sem quórum'}
          </Badge>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`${base}/sessoes/${session.id}`}>
              <Users /> Presença
            </Link>
          </Button>
          {sessionNotOpen && canOperate && (
            <Button size="sm" onClick={() => openSession.run(session.id, 'open')} loading={openSession.pending}>
              <Play /> Abrir sessão
            </Button>
          )}
        </div>
      </Card>

      {sessionNotOpen && <Alert tone="info" title="Sessão ainda não aberta">Abra a sessão para registrar presença e iniciar os itens da Ordem do Dia.</Alert>}
      {sessionClosed && <Alert tone="info" title={`Sessão ${SessionStatusMeta[session.status].label.toLowerCase()}`}>Modo de consulta. Nenhum comando disponível.</Alert>}
      {!live.hasQuorum && !sessionClosed && !sessionNotOpen && (
        <Alert tone="warning" title="Quórum de deliberação não atingido">
          {settings?.voting.withoutQuorumBehavior === 'block' ? 'A abertura de votação está bloqueada até que o quórum mínimo seja atingido.' : 'A votação poderá ser aberta, mas o resultado será registrado como SEM QUÓRUM.'}
        </Alert>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {/* Matéria atual */}
          <Card className={cn('overflow-hidden', votingOpen && 'ring-2 ring-violet/50')}>
            {currentItem && proposition ? (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-5 py-3">
                  <Badge tone="primary">Item {currentItem.order}</Badge>
                  <StatusBadge meta={AgendaItemStatusMeta[currentItem.status]} />
                  {voting && <StatusBadge meta={VotingStatusMeta[voting.status]} />}
                  {voting && voting.round > 1 && <Badge>{voting.round}ª rodada</Badge>}
                  <div className="ml-auto">{openVoting && <Countdown voting={openVoting} size="lg" />}</div>
                </div>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Matéria em apreciação</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight">{lk.title(proposition)}</h2>
                    <p className="mt-2 leading-relaxed text-foreground/85">{proposition.summary}</p>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Autor</dt>
                      <dd className="font-medium">{proposition.authorName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Parecer</dt>
                      <dd className="flex flex-wrap gap-1">
                        {itemOpinions.length ? (
                          itemOpinions.map((o) => (
                            <Badge key={o.id} tone={OpinionConclusionMeta[o.conclusion!].tone}>
                              {lk.committees.get(o.committeeId)?.acronym}: {OpinionConclusionMeta[o.conclusion!].label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">Sem parecer</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Votação</dt>
                      <dd className="font-medium">{VotingMethodLabel[currentItem.votingMethod]}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Quórum</dt>
                      <dd className="font-medium" title={quorumRule ? describeQuorumRule(quorumRule) : undefined}>
                        {quorumRule ? `${quorumRule.name}` : '—'}
                        {quorumRule && <span className="block text-xs font-normal text-muted-foreground">{QuorumTypeLabel[quorumRule.type]}</span>}
                      </dd>
                    </div>
                  </dl>
                  <Button variant="link" size="sm" className="h-auto p-0" asChild>
                    <Link to={`/admin/proposicoes/${proposition.id}`} target="_blank">
                      <FileText /> Ver texto integral e tramitação
                    </Link>
                  </Button>
                </CardContent>
              </>
            ) : (
              <EmptyState icon={ListOrdered} title="Nenhum item em apreciação" description={live.items.length ? 'Inicie o próximo item da pauta para começar.' : 'A sessão não possui pauta. Monte a pauta antes de iniciar a Ordem do Dia.'} />
            )}

            {/* Comandos */}
            {canOperate && !sessionClosed && !sessionNotOpen && (
              <div className="border-t bg-muted/30 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comandos da Presidência</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {currentItem && st === 'pending' && (
                    <Button size="lg" onClick={() => startItem.run(sessionId, currentItem.id)} disabled={busy}>
                      <Play /> Iniciar item
                    </Button>
                  )}
                  {currentItem && (st === 'reading' || st === 'discussion_closed') && !votingOpen && (
                    <Button size="lg" variant="secondary" onClick={() => openDisc.run(sessionId, currentItem.id)} disabled={busy}>
                      <MessageSquare /> Abrir discussão
                    </Button>
                  )}
                  {currentItem && st === 'discussion' && (
                    <Button size="lg" variant="secondary" onClick={() => closeDisc.run(sessionId, currentItem.id)} disabled={busy}>
                      <MessageSquareOff /> Encerrar discussão
                    </Button>
                  )}
                  {currentItem && (st === 'reading' || st === 'discussion_closed') && !votingOpen && (
                    <Button size="lg" variant="accent" onClick={() => setStartOpen(true)} disabled={busy}>
                      <VoteIcon /> Iniciar votação
                    </Button>
                  )}
                  {openVoting && (
                    <Button size="lg" variant="success" onClick={requestClose} disabled={busy}>
                      <CircleStop /> Encerrar votação
                    </Button>
                  )}
                  {voting && (voting.status === 'open' || voting.status === 'closed') && currentItem?.id === voting.agendaItemId && (
                    <Button size="lg" variant="outline" className="border-danger/40 text-danger hover:bg-danger-soft" onClick={() => setCancelOpen(true)} disabled={busy}>
                      <Ban /> Anular votação
                    </Button>
                  )}
                  {voting && (voting.status === 'closed' || voting.status === 'cancelled') && settings?.voting.allowReopen && currentItem?.id === voting.agendaItemId && (
                    <Button size="lg" variant="outline" onClick={() => setReopenOpen(true)} disabled={busy}>
                      <RotateCcw /> Reabrir votação
                    </Button>
                  )}
                  {!votingOpen && (
                    <Button size="lg" variant="outline" onClick={() => next.run(sessionId)} disabled={busy}>
                      <SkipForward /> Próximo item
                    </Button>
                  )}
                  {currentItem && !votingOpen && ['pending', 'reading', 'discussion', 'discussion_closed'].includes(st ?? '') && (
                    <Button size="lg" variant="ghost" onClick={() => outcome.run(sessionId, currentItem.id, 'postponed')} disabled={busy}>
                      <Undo2 /> Adiar item
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Votação */}
          {voting && tally && (
            <section aria-labelledby="votacao-titulo" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="votacao-titulo" className="text-lg font-semibold">
                  {voting.status === 'open' ? 'Votação em andamento' : voting.status === 'closed' ? 'Resultado da votação' : 'Votação anulada'}
                </h2>
                {voting.result && voting.status === 'closed' && <OutcomeSeal outcome={voting.result.outcome} size="lg" />}
              </div>
              {voting.status === 'cancelled' && <Alert tone="danger" title="Votação anulada">{voting.cancelReason}</Alert>}
              <VotingCounters tally={voting.result ?? tally} labels={labels} />
              {voting.result && voting.status === 'closed' && (
                <Alert tone={voting.result.outcome === 'approved' ? 'success' : voting.result.outcome === 'rejected' ? 'danger' : 'warning'} title={`${OUTCOME_LABEL[voting.result.outcome]} — necessários ${voting.result.requiredVotes} votos favoráveis`}>
                  {voting.result.explanation}
                </Alert>
              )}
              {voting.method === 'symbolic' ? (
                <SymbolicPanel key={voting.id} votingId={voting.id} open={voting.status === 'open'} tally={voting.symbolicTally ?? { yes: 0, no: 0, abstention: 0 }} max={voting.eligibleIds.length} labels={labels} disabled={!canOperate} />
              ) : (
                <NominalTable voting={voting} votes={live.votes} />
              )}
            </section>
          )}
        </div>

        {/* Pauta lateral */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle>Pauta da sessão</CardTitle>
              {proposition && currentItem && canOperate && !sessionClosed && <ImpedimentDialog propositionId={proposition.id} members={live.members} impediments={live.impediments} disabled={votingOpen} />}
            </CardHeader>
            <ol className="divide-y">
              {live.items.map((item) => (
                <AgendaRow key={item.id} item={item} active={item.id === currentItem?.id} canStart={canOperate && !votingOpen && !sessionClosed && !sessionNotOpen && item.status === 'pending'} onStart={() => startItem.run(sessionId, item.id)} />
              ))}
              {live.items.length === 0 && <li className="p-4 text-sm text-muted-foreground">Pauta vazia.</li>}
            </ol>
          </Card>
          {voting?.status === 'open' && (
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prévia do painel</p>
              <VotingSummary tally={tally!} className="mt-3" />
            </Card>
          )}
        </aside>
      </div>

      {/* Diálogos */}
      {currentItem && settings && (
        <StartVotingDialog
          open={startOpen}
          onOpenChange={setStartOpen}
          defaults={{ durationSeconds: settings.voting.defaultDurationSeconds, automaticClose: settings.voting.automaticClose }}
          methodLabel={VotingMethodLabel[currentItem.votingMethod]}
          quorumLabel={quorumRule?.name ?? '—'}
          presentCount={live.presentIds.length}
          impeded={live.impediments.length}
          onConfirm={(opts) => votingService.start(sessionId, currentItem.id, opts)}
        />
      )}
      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        tone="warning"
        title="Tem certeza que deseja encerrar esta votação?"
        description={tally ? `Votaram ${tally.yes + tally.no + tally.abstention} de ${tally.eligible} aptos. ${tally.notVoted} vereador(es) ainda não votaram. Após o encerramento não será possível registrar novos votos.` : ''}
        confirmLabel="Encerrar votação"
        onConfirm={() => openVoting && close.run(openVoting.id)}
      />
      <TiebreakDialog open={tiebreakOpen} onOpenChange={setTiebreakOpen} labels={labels} presidentName={lk.councilorName(session.presidentId)} onConfirm={(choice) => openVoting && close.run(openVoting.id, { tiebreakVote: choice })} />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Anular esta votação?"
        description="Os votos desta rodada serão desconsiderados e a anulação ficará registrada na auditoria. Esta operação exige permissão específica."
        confirmLabel="Anular votação"
        requireReason
        onConfirm={(reason) => voting && cancel.run(voting.id, reason)}
      />
      <ConfirmDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        tone="warning"
        title="Reabrir votação?"
        description="A rodada anterior será anulada (se encerrada) e uma nova votação será aberta para o mesmo item. A operação será auditada."
        confirmLabel="Reabrir"
        requireReason
        onConfirm={(reason) => voting && reopen.run(voting.id, reason)}
      />
    </div>
  )
}

function AgendaRow({ item, active, canStart, onStart }: { item: AgendaItem; active: boolean; canStart: boolean; onStart: () => void }) {
  const lk = useLookups()
  const { data: props } = useCollection('propositions')
  const p = props?.find((x) => x.id === item.propositionId)
  return (
    <li className={cn('flex gap-3 px-4 py-3', active && 'bg-primary/5')} aria-current={active ? 'step' : undefined}>
      <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{item.order}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{p ? lk.code(p) : '—'}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{p?.summary}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge meta={AgendaItemStatusMeta[item.status]} />
          {canStart && !active && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onStart}>
              Iniciar
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

function StartVotingDialog({
  open,
  onOpenChange,
  defaults,
  methodLabel,
  quorumLabel,
  presentCount,
  impeded,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaults: { durationSeconds: number; automaticClose: boolean }
  methodLabel: string
  quorumLabel: string
  presentCount: number
  impeded: number
  onConfirm: (opts: { durationSeconds: number; automaticClose: boolean }) => Promise<unknown>
}) {
  const [duration, setDuration] = useState(defaults.durationSeconds)
  const [auto, setAuto] = useState(defaults.automaticClose)
  const start = useAction(onConfirm, { success: 'Votação iniciada.', onSuccess: () => onOpenChange(false) })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Iniciar votação"
        description="A matéria será disponibilizada imediatamente nos terminais dos vereadores aptos e no painel do Plenário."
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button variant="accent" onClick={() => start.run({ durationSeconds: duration, automaticClose: auto })} loading={start.pending} disabled={duration < 10}>
              <VoteIcon /> Iniciar votação
            </Button>
          </>
        }
      >
        <dl className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/60 p-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Tipo de votação</dt>
            <dd className="font-medium">{methodLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Quórum</dt>
            <dd className="font-medium">{quorumLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Presentes</dt>
            <dd className="font-medium">{presentCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Impedidos</dt>
            <dd className="font-medium">{impeded}</dd>
          </div>
        </dl>
        <div className="grid gap-4">
          <Field label="Tempo de votação (segundos)" hint="Cronômetro exibido para vereadores e no painel.">
            {(id) => <Input id={id} type="number" min={10} max={1800} step={10} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />}
          </Field>
          <SwitchField label="Encerramento automático" description="Encerra e apura automaticamente quando o cronômetro zerar." checked={auto} onCheckedChange={setAuto} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TiebreakDialog({ open, onOpenChange, labels, presidentName, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; labels: { yes: string; no: string }; presidentName: string; onConfirm: (c: VoteChoice) => unknown }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Empate — voto de desempate" description={`Pela regra configurada, o Presidente (${presidentName}) exerce o voto de desempate antes da proclamação do resultado.`} size="sm">
        <Alert tone="warning" className="mb-4">
          O voto de desempate será registrado na auditoria.
        </Alert>
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="xl"
            variant="success"
            onClick={() => {
              onOpenChange(false)
              onConfirm('yes')
            }}
          >
            {labels.yes}
          </Button>
          <Button
            size="xl"
            variant="destructive"
            onClick={() => {
              onOpenChange(false)
              onConfirm('no')
            }}
          >
            {labels.no}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Votação simbólica: a Presidência declara o resultado (sem identificação individual). */
function SymbolicPanel({ votingId, open, tally, max, labels, disabled }: { votingId: string; open: boolean; tally: { yes: number; no: number; abstention: number }; max: number; labels: { yes: string; no: string; abstention: string }; disabled: boolean }) {
  const [draft, setDraft] = useState(tally)
  const save = useAction(votingService.setSymbolicTally, { success: 'Contagem simbólica registrada.' })
  const fields = [
    { key: 'yes' as const, label: labels.yes },
    { key: 'no' as const, label: labels.no },
    { key: 'abstention' as const, label: labels.abstention },
  ]
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>Votação simbólica</CardTitle>
        <Badge>Sem identificação individual</Badge>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">Os vereadores que aprovam permanecem como se encontram. Registre a contagem verificada pela Mesa ({max} aptos).</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {(id) => <Input id={id} type="number" min={0} max={max} value={draft[f.key]} disabled={!open || disabled} onChange={(e) => setDraft({ ...draft, [f.key]: Math.max(0, Number(e.target.value)) })} className="text-lg font-bold" />}
            </Field>
          ))}
          <div className="flex items-end">
            <Button className="w-full" onClick={() => save.run(votingId, draft)} loading={save.pending} disabled={!open || disabled}>
              Registrar contagem
            </Button>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" disabled={!open || disabled} onClick={() => setDraft({ yes: max, no: 0, abstention: 0 })}>
            Aprovação unânime
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
