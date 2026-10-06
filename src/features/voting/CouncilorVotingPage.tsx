import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCircle2, ChevronDown, Clock, EyeOff, Hourglass, Lock, Minus, Monitor, ShieldAlert, UserCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Badge, Card } from '@/components/ui/display'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { ErrorState, PageSkeleton } from '@/components/common/states'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { AgendaItemStatusMeta, OpinionConclusionMeta, SessionTypeLabel, VotingMethodLabel } from '@/domain/labels'
import { canCouncilorVote, VOTE_DENIAL_LABEL } from '@/domain/voting/votingEngine'
import { useAction, useCollection, useLookups } from '@/hooks/useData'
import { attendanceService, votingService } from '@/services/plenaryService'
import { useAuthStore } from '@/stores/authStore'
import { formatDateTime, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Vote, VoteChoice } from '@/types'
import { Countdown } from './Countdown'
import { useLiveSession } from './useLiveSession'

const CHOICES: Array<{ key: VoteChoice; icon: typeof Check; sub: string; cls: string; ring: string }> = [
  { key: 'yes', icon: Check, sub: 'FAVORÁVEL', cls: 'bg-success text-white hover:bg-success/90 dark:text-background', ring: 'focus-visible:outline-success' },
  { key: 'no', icon: X, sub: 'CONTRÁRIO', cls: 'bg-danger text-white hover:bg-danger/90 dark:text-background', ring: 'focus-visible:outline-danger' },
  { key: 'abstention', icon: Minus, sub: 'ABSTER-SE', cls: 'bg-warning text-black hover:bg-warning/90', ring: 'focus-visible:outline-warning' },
]

/**
 * Terminal de votação do vereador (tablet-first).
 * Quando há votação aberta, ela domina a interface: botões grandes, confirmação obrigatória, bloqueio após votar.
 */
export default function CouncilorVotingPage() {
  const user = useAuthStore((s) => s.user)
  const councilorId = user?.councilorId ?? ''
  const live = useLiveSession()
  const lk = useLookups()
  const opinions = useCollection('opinions')
  const [pending, setPending] = useState<VoteChoice | null>(null)
  const [receipt, setReceipt] = useState<Vote | null>(null)
  const [details, setDetails] = useState(false)
  const cast = useAction(votingService.castVote, {
    success: 'Voto registrado com sucesso.',
    onSuccess: (v) => {
      setReceipt(v)
      setPending(null)
    },
  })
  const presence = useAction(attendanceService.set, { success: 'Presença registrada.' })

  if (live.isLoading) return <PageSkeleton />
  if (live.isError) return <ErrorState />
  if (!councilorId) return <Alert tone="warning" title="Usuário sem vínculo com vereador">Este usuário não está vinculado a um vereador.</Alert>

  const { session, openVoting, voting, proposition, settings, currentItem } = live
  const labels = settings?.voting.labels ?? { yes: 'SIM', no: 'NÃO', abstention: 'ABSTENÇÃO' }
  const myAttendance = live.attendance.find((a) => a.councilorId === councilorId)
  const sessionLive = session && ['open', 'in_progress', 'suspended'].includes(session.status)

  // ---- Sem sessão ativa ----
  if (!session || !sessionLive) {
    return (
      <WaitingScreen
        icon={Hourglass}
        title="Nenhuma sessão em andamento"
        description={session ? `Próxima sessão: ${SessionTypeLabel[session.type]} nº ${session.number}/${session.year}.` : 'Aguarde a convocação da próxima sessão.'}
      />
    )
  }

  const sessionStrip = (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">
        Sessão {SessionTypeLabel[session.type]} nº {session.number}/{session.year}
      </span>
      <span>Aberta às {session.openedAt ? formatTime(session.openedAt) : session.startTime}</span>
      <span>{live.presentIds.length} presentes</span>
    </div>
  )

  // ---- Presença ----
  if (myAttendance?.status !== 'present') {
    const impeded = myAttendance?.status === 'impeded'
    return (
      <div className="mx-auto max-w-xl py-6 text-center">
        {sessionStrip}
        <Card className="mt-6 p-8">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="size-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">Registro de presença</h1>
          <p className="mt-2 text-muted-foreground">
            {impeded ? 'Sua presença foi registrada como impedimento pela Secretaria.' : myAttendance?.status === 'justified' ? 'Consta ausência justificada. Caso tenha chegado, registre sua presença.' : 'Confirme sua presença para participar das votações desta sessão.'}
          </p>
          {!impeded && (
            <Button size="xl" className="mt-6 w-full" onClick={() => presence.run(session.id, councilorId, 'present')} loading={presence.pending}>
              <UserCheck /> Registrar presença
            </Button>
          )}
        </Card>
      </div>
    )
  }

  const activeVoting = openVoting
  const check = activeVoting ? canCouncilorVote(activeVoting, councilorId) : null
  const myVote = receipt?.votingId === activeVoting?.id ? receipt : activeVoting ? live.votes.find((v) => v.councilorId === councilorId) : undefined
  const alreadyVoted = !!activeVoting?.participantIds.includes(councilorId)

  // ---- Votação aberta: domina a interface ----
  if (activeVoting && proposition) {
    const itemOpinions = (opinions.data ?? []).filter((o) => o.propositionId === proposition.id && o.conclusion)

    if (alreadyVoted) {
      return (
        <div className="mx-auto max-w-2xl py-4">
          <Card className="overflow-hidden border-success/40" role="status" aria-live="polite">
            <div className="bg-success px-6 py-8 text-center text-white dark:text-background">
              <CheckCircle2 className="mx-auto size-16" aria-hidden />
              <h1 className="mt-3 text-2xl font-extrabold tracking-wide sm:text-3xl">VOTO REGISTRADO COM SUCESSO</h1>
            </div>
            <dl className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Matéria</dt>
                <dd className="font-semibold">{lk.title(proposition)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Voto</dt>
                <dd className="text-2xl font-extrabold">
                  {activeVoting.method === 'secret' && !myVote ? (
                    <span className="inline-flex items-center gap-2 text-base">
                      <EyeOff className="size-5" /> Sigiloso
                    </span>
                  ) : myVote ? (
                    labels[myVote.choice]
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Horário</dt>
                <dd className="font-semibold tabular">{myVote ? formatDateTime(myVote.castAt) : '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Identificador do voto</dt>
                <dd className="font-mono text-lg font-bold">{myVote?.code ?? 'Registrado (consulte seu histórico)'}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-2 border-t bg-muted/40 px-6 py-3 text-sm text-muted-foreground">
              <Lock className="size-4" aria-hidden /> Novo voto bloqueado nesta votação. Aguarde o encerramento pela Presidência.
            </div>
          </Card>
          <div className="mt-4 flex justify-center">
            <Countdown voting={activeVoting} />
          </div>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-4xl space-y-5 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone="accent" className="animate-pulse-ring px-3 py-1 text-sm text-violet">
            <span className="size-2 rounded-full bg-violet" aria-hidden /> VOTAÇÃO ABERTA
          </Badge>
          <Countdown voting={activeVoting} size="lg" />
        </div>

        <Card className="p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Votação {VotingMethodLabel[activeVoting.method].toLowerCase()} · {activeVoting.quorumRule.name}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">{lk.title(proposition)}</h1>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ementa</p>
          <p className="mt-1 text-lg leading-relaxed sm:text-xl">{proposition.summary}</p>

          <button onClick={() => setDetails(!details)} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" aria-expanded={details}>
            <ChevronDown className={cn('size-4 transition-transform', details && 'rotate-180')} aria-hidden /> Informações adicionais
          </button>
          {details && (
            <dl className="mt-3 grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Autor</dt>
                <dd className="font-medium">{proposition.authorName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pareceres</dt>
                <dd>{itemOpinions.length ? itemOpinions.map((o) => `${lk.committees.get(o.committeeId)?.acronym}: ${OpinionConclusionMeta[o.conclusion!].label}`).join(' · ') : 'Sem parecer'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Texto</dt>
                <dd className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line font-serif leading-relaxed">{proposition.fullText}</dd>
              </div>
            </dl>
          )}
        </Card>

        {check && !check.allowed ? (
          <Alert tone="warning" title="Você não pode votar nesta matéria">
            {VOTE_DENIAL_LABEL[check.reason]}
          </Alert>
        ) : (
          <section aria-labelledby="pergunta-voto">
            <h2 id="pergunta-voto" className="mb-3 text-center text-xl font-bold">
              Como deseja votar?
            </h2>
            {activeVoting.method === 'secret' && (
              <p className="mb-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <EyeOff className="size-4" aria-hidden /> Votação secreta: seu voto não será associado publicamente ao seu nome.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {CHOICES.filter((c) => c.key !== 'abstention' || settings?.voting.allowAbstention).map((c) => (
                <button
                  key={c.key}
                  onClick={() => setPending(c.key)}
                  className={cn('flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl px-4 py-5 shadow-md transition-transform focus-visible:outline-4 focus-visible:outline-offset-4 active:scale-[0.98] sm:min-h-44', c.cls, c.ring)}
                  aria-label={`Votar ${labels[c.key]}`}
                >
                  <c.icon className="size-10 sm:size-14" strokeWidth={2.5} aria-hidden />
                  <span className="text-3xl font-extrabold tracking-wide sm:text-4xl">{labels[c.key]}</span>
                  <span className="text-sm font-semibold opacity-85">{c.sub}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
          {pending && (
            <DialogContent
              title="CONFIRMAR VOTO"
              description={lk.title(proposition)}
              size="sm"
              footer={
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button size="lg" variant="outline" onClick={() => setPending(null)} disabled={cast.pending}>
                    Cancelar
                  </Button>
                  <Button size="lg" variant={pending === 'yes' ? 'success' : pending === 'no' ? 'destructive' : 'warning'} onClick={() => cast.run(activeVoting.id, councilorId, pending)} loading={cast.pending} autoFocus>
                    Confirmar voto
                  </Button>
                </div>
              }
            >
              <p className="text-center text-muted-foreground">Você selecionou:</p>
              <p className={cn('mt-2 text-center text-5xl font-extrabold', pending === 'yes' ? 'text-success' : pending === 'no' ? 'text-danger' : 'text-warning')}>{labels[pending]}</p>
              <p className="mt-4 text-center text-xs text-muted-foreground">Após a confirmação o voto não poderá ser alterado.</p>
            </DialogContent>
          )}
        </Dialog>
      </div>
    )
  }

  // ---- Sessão aberta sem votação ----
  const lastResult = voting?.status === 'closed' && voting.result ? voting : null
  return (
    <div className="mx-auto max-w-3xl space-y-5 py-2">
      {sessionStrip}
      {currentItem && proposition ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">Item {currentItem.order}</Badge>
            <Badge tone={AgendaItemStatusMeta[currentItem.status].tone} dot>
              {AgendaItemStatusMeta[currentItem.status].label}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold">{lk.title(proposition)}</h1>
          <p className="mt-2 text-lg leading-relaxed text-foreground/85">{proposition.summary}</p>
          {lastResult?.result && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-muted/60 p-4">
              <span className="text-sm text-muted-foreground">Resultado:</span>
              <OutcomeSeal outcome={lastResult.result.outcome} />
              <span className="text-sm tabular">
                {labels.yes} {lastResult.result.yes} · {labels.no} {lastResult.result.no} · {labels.abstention} {lastResult.result.abstention}
              </span>
            </div>
          )}
        </Card>
      ) : null}
      <WaitingScreen icon={Clock} title="Aguardando abertura de votação" description="Esta tela será atualizada automaticamente quando a Presidência iniciar uma votação." compact />
    </div>
  )
}

function WaitingScreen({ icon: Icon, title, description, compact }: { icon: typeof Clock; title: string; description: string; compact?: boolean }) {
  return (
    <Card className={cn('mx-auto max-w-xl text-center', compact ? 'p-6' : 'mt-8 p-10')}>
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-7" aria-hidden />
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="outline" asChild>
          <Link to="/vereador/materias">Consultar matérias</Link>
        </Button>
        <Button variant="ghost" asChild>
          <a href="/plenario" target="_blank" rel="noopener">
            <Monitor /> Painel
          </a>
        </Button>
      </div>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="size-3.5" aria-hidden /> Ambiente demonstrativo — a integridade do voto será garantida pelo backend na fase de produção.
      </p>
    </Card>
  )
}
