import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ClipboardList, Gavel, Monitor, Users, Vote, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@/components/ui/display'
import { PageHeader, StatCard } from '@/components/common/page'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { SessionStatusMeta, SessionTypeLabel } from '@/domain/labels'
import { useCollection, useLookups } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatDateTimeShort } from '@/lib/format'
import { Countdown } from './Countdown'
import { useLiveSession } from './useLiveSession'

export default function PresidencyDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const live = useLiveSession()
  const lk = useLookups()
  const sessions = useCollection('sessions')
  if (live.isLoading || sessions.isLoading) return <PageSkeleton />

  const upcoming = (sessions.data ?? []).filter((s) => s.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
  const closedVotings = live.allVotings.filter((v) => v.status === 'closed' && v.result).sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''))
  const approved = closedVotings.filter((v) => v.result!.outcome === 'approved').length
  const { session } = live

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${user?.name.split(' ')[0] ?? 'Presidente'}`}
        description="Visão da Presidência: sessão em curso, pauta e votações."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/plenario" target="_blank" rel="noopener">
                <Monitor /> Painel do Plenário
              </a>
            </Button>
            <Button asChild>
              <Link to="/presidencia/ordem-do-dia">
                <Gavel /> Conduzir Ordem do Dia
              </Link>
            </Button>
          </>
        }
      />

      {session ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 bg-sidebar px-5 py-4 text-white">
            <Gavel className="size-5 text-brand-2" aria-hidden />
            <p className="font-semibold">
              Sessão {SessionTypeLabel[session.type]} nº {session.number}/{session.year} · {formatDate(session.date)} às {session.startTime}
            </p>
            <StatusBadge meta={SessionStatusMeta[session.status]} className="ml-auto" />
          </div>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Presença</p>
              <p className="mt-1 text-3xl font-bold tabular">
                {live.presentIds.length}
                <span className="text-lg text-muted-foreground">/{live.members.length}</span>
              </p>
              <Badge tone={live.hasQuorum ? 'success' : 'danger'} dot className="mt-1">
                {live.hasQuorum ? 'Quórum atingido' : `Mínimo ${live.requiredPresence}`}
              </Badge>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Item atual</p>
              {live.proposition ? (
                <>
                  <p className="mt-1 font-semibold">{lk.title(live.proposition)}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{live.proposition.summary}</p>
                  {live.openVoting && (
                    <div className="mt-2 flex items-center gap-3">
                      <Badge tone="accent">Votação aberta</Badge>
                      <Countdown voting={live.openVoting} />
                      <span className="text-sm tabular">
                        {live.openVoting.participantIds.length}/{live.openVoting.eligibleIds.length} votaram
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Nenhum item iniciado. {live.items.length} item(ns) na pauta.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={CalendarDays} title="Nenhuma sessão em curso" />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Itens na pauta atual" value={live.items.length} icon={ClipboardList} />
        <StatCard label="Votações realizadas" value={closedVotings.length} icon={Vote} tone="info" />
        <StatCard label="Matérias aprovadas" value={approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Matérias não aprovadas" value={closedVotings.length - approved} icon={XCircle} tone="danger" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas sessões</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link to="/presidencia/sessoes">Ver todas</Link>
            </Button>
          </CardHeader>
          <ul className="divide-y">
            {upcoming.map((s) => (
              <li key={s.id}>
                <Link to={`/presidencia/sessoes/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                  <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-center text-primary">
                    <span className="text-[10px] font-semibold uppercase leading-none">{formatDate(s.date).slice(3, 5)}/{s.year % 100}</span>
                    <span className="text-lg font-bold leading-none">{formatDate(s.date).slice(0, 2)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {SessionTypeLabel[s.type]} nº {s.number}/{s.year}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.startTime} · {s.location}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            {upcoming.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">Nenhuma sessão agendada.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimas votações</CardTitle>
          </CardHeader>
          <ul className="divide-y">
            {closedVotings.slice(0, 5).map((v) => {
              const p = live.propositions.find((x) => x.id === v.propositionId)
              return (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p ? lk.code(p) : '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeShort(v.closedAt)} · SIM {v.result!.yes} · NÃO {v.result!.no} · ABST. {v.result!.abstention}
                    </p>
                  </div>
                  <OutcomeSeal outcome={v.result!.outcome} size="sm" />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5" aria-hidden /> Dica: abra o Portal do Vereador em outra aba (Visualizar como → Vereador) para acompanhar a votação em tempo real.
      </p>
    </div>
  )
}
