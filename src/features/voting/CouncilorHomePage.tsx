import { Link } from 'react-router-dom'
import { CalendarDays, FileText, ScrollText, UserCheck, Vote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Card, CardHeader, CardTitle, StatusBadge } from '@/components/ui/display'
import { PageHeader, StatCard } from '@/components/common/page'
import { PageSkeleton } from '@/components/common/states'
import { PropositionStatusMeta, SessionTypeLabel } from '@/domain/labels'
import { useCollection, useLookups } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatPercent } from '@/lib/format'
import { useLiveSession } from './useLiveSession'

export default function CouncilorHomePage() {
  const user = useAuthStore((s) => s.user)
  const id = user?.councilorId ?? ''
  const live = useLiveSession()
  const lk = useLookups()
  const attendance = useCollection('attendance')
  const sessions = useCollection('sessions')
  if (live.isLoading || attendance.isLoading || sessions.isLoading) return <PageSkeleton />

  const mine = live.propositions.filter((p) => p.authorId === id || p.coauthorIds.includes(id))
  const att = (attendance.data ?? []).filter((a) => a.councilorId === id && a.status !== 'pending')
  const presence = att.length ? att.filter((a) => a.status === 'present').length / att.length : 0
  const myVotes = live.allVotes.filter((v) => v.councilorId === id)
  const upcoming = (sessions.data ?? []).filter((s) => s.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)

  return (
    <div className="space-y-6">
      <PageHeader title={`Olá, ${lk.councilorName(id)}`} description="Portal do Vereador — matérias, sessões e votação eletrônica." />

      {live.openVoting ? (
        <Alert
          tone="warning"
          title="Votação aberta agora"
          action={
            <Button asChild>
              <Link to="/vereador/votacao">
                <Vote /> Ir para votação
              </Link>
            </Button>
          }
        >
          {live.proposition ? lk.title(live.proposition) : 'Matéria em votação'} aguarda o seu voto.
        </Alert>
      ) : live.session && ['open', 'in_progress'].includes(live.session.status) ? (
        <Alert
          tone="info"
          title={`Sessão ${SessionTypeLabel[live.session.type]} nº ${live.session.number}/${live.session.year} em andamento`}
          action={
            <Button variant="outline" asChild>
              <Link to="/vereador/votacao">
                <UserCheck /> Terminal de votação
              </Link>
            </Button>
          }
        >
          Acesse o terminal para registrar presença e votar.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Minhas proposições" value={mine.length} icon={FileText} />
        <StatCard label="Presença" value={formatPercent(presence)} icon={UserCheck} tone="success" hint={`${att.length} sessões registradas`} />
        <StatCard label="Votos registrados" value={myVotes.length} icon={Vote} tone="info" />
        <StatCard label="Próximas sessões" value={upcoming.length} icon={CalendarDays} tone="accent" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Minhas proposições</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link to="/vereador/materias">Ver matérias</Link>
            </Button>
          </CardHeader>
          <ul className="divide-y">
            {mine.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link to={`/vereador/materias/${p.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{lk.code(p)}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{p.summary}</p>
                  </div>
                  <StatusBadge meta={PropositionStatusMeta[p.status]} />
                </Link>
              </li>
            ))}
            {mine.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">Nenhuma proposição de sua autoria.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Próximas sessões</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link to="/vereador/historico">
                <ScrollText /> Meu histórico
              </Link>
            </Button>
          </CardHeader>
          <ul className="divide-y">
            {upcoming.map((s) => (
              <li key={s.id} className="px-5 py-3">
                <p className="font-medium">
                  {SessionTypeLabel[s.type]} nº {s.number}/{s.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(s.date)} às {s.startTime} · {s.location}
                </p>
              </li>
            ))}
            {upcoming.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">Nenhuma sessão agendada.</li>}
          </ul>
        </Card>
      </div>
    </div>
  )
}
