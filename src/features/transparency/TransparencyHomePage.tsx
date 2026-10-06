import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  FileText,
  Gavel,
  Landmark,
  ScrollText,
  Search,
  Stamp,
  UserCheck,
  Vote,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/display'
import { Input } from '@/components/ui/form-controls'
import { StatCard } from '@/components/common/page'
import { EmptyState } from '@/components/common/states'
import { useCollection, useLookups, useOrganization } from '@/hooks/useData'
import { APPROVED_STATUSES, IN_PROGRESS_STATUSES, SessionTypeLabel } from '@/domain/labels'
import { formatDateLong } from '@/lib/format'
import { DateBlock, PropositionListItem, PUBLIC_BASE, PublicContainer, sessionTitle, useIndex, usePublicPropositions, usePublicVotings, VotingListItem } from './shared'

const SHORTCUTS = [
  { label: 'Projetos', icon: FileText, to: `${PUBLIC_BASE}/proposicoes?categoria=projetos` },
  { label: 'Leis', icon: Stamp, to: `${PUBLIC_BASE}/proposicoes?categoria=leis` },
  { label: 'Resoluções', icon: BookOpen, to: `${PUBLIC_BASE}/proposicoes?categoria=resolucoes` },
  { label: 'Decretos Legislativos', icon: Landmark, to: `${PUBLIC_BASE}/proposicoes?categoria=decretos` },
  { label: 'Pautas', icon: ClipboardList, to: `${PUBLIC_BASE}/pautas` },
  { label: 'Atas', icon: ScrollText, to: `${PUBLIC_BASE}/atas` },
  { label: 'Pareceres', icon: FileCheck2, to: `${PUBLIC_BASE}/pareceres` },
  { label: 'Votações', icon: Vote, to: `${PUBLIC_BASE}/votacoes` },
  { label: 'Presenças', icon: UserCheck, to: `${PUBLIC_BASE}/vereadores` },
  { label: 'Tramitação', icon: Workflow, to: `${PUBLIC_BASE}/proposicoes` },
]

export default function TransparencyHomePage() {
  const { data: org } = useOrganization()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const lk = useLookups()
  const props = usePublicPropositions()
  const votings = usePublicVotings()
  const sessions = useCollection('sessions')
  const propIndex = useIndex(props.data)
  const sessionIndex = useIndex(sessions.data)

  const stats = useMemo(() => {
    const p = props.data ?? []
    return {
      total: p.length,
      inProgress: p.filter((x) => IN_PROGRESS_STATUSES.includes(x.status)).length,
      approved: p.filter((x) => APPROVED_STATUSES.includes(x.status)).length,
      sessions: (sessions.data ?? []).filter((s) => s.status === 'closed').length,
    }
  }, [props.data, sessions.data])

  const upcoming = useMemo(
    () => (sessions.data ?? []).filter((s) => ['scheduled', 'open', 'in_progress', 'suspended'].includes(s.status)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4),
    [sessions.data],
  )

  function submit(e: FormEvent) {
    e.preventDefault()
    navigate(`${PUBLIC_BASE}/proposicoes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  return (
    <>
      <section className="relative overflow-hidden border-b bg-sidebar text-white" aria-labelledby="hero-title">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="pointer-events-none absolute -right-32 -top-32 size-[420px] rounded-full border-[48px] border-brand-2/15" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-2">Portal da Transparência</p>
          <h1 id="hero-title" className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight text-balance sm:text-4xl lg:text-5xl">
            Acompanhe a atividade legislativa da {org?.name ?? 'Câmara Municipal'}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">Consulte proposições, tramitação, sessões, pautas, atas, pareceres e o resultado das votações em Plenário.</p>
          <form onSubmit={submit} role="search" className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row">
            <label htmlFor="busca-publica" className="sr-only">
              Buscar proposições
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="busca-publica"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Número, ementa, autor ou assunto — ex.: 025/2026, iluminação"
                className="h-13 rounded-xl border-0 pl-12 text-base text-foreground shadow-lg"
              />
            </div>
            <Button type="submit" size="lg" variant="accent" className="h-13 rounded-xl px-7">
              Buscar
            </Button>
          </form>
        </div>
      </section>

      <PublicContainer className="space-y-10">
        <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {props.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Proposições" value={stats.total} icon={FileText} hint={`Apresentadas em ${new Date().getFullYear()}`} />
              <StatCard label="Em tramitação" value={stats.inProgress} icon={Workflow} tone="info" />
              <StatCard label="Aprovadas" value={stats.approved} icon={Gavel} tone="success" />
              <StatCard label="Sessões realizadas" value={stats.sessions} icon={CalendarDays} tone="accent" />
            </>
          )}
        </section>

        <section aria-labelledby="atalhos">
          <h2 id="atalhos" className="font-serif text-xl font-semibold">
            Consultas
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SHORTCUTS.map((s) => (
              <li key={s.label}>
                <Link to={s.to} className="group flex h-full items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium leading-tight group-hover:text-primary">{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <section aria-labelledby="recentes">
            <div className="flex items-end justify-between gap-3">
              <h2 id="recentes" className="font-serif text-xl font-semibold">
                Proposições recentes
              </h2>
              <Link to={`${PUBLIC_BASE}/proposicoes`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver todas <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            {props.isLoading || !lk.ready ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {(props.data ?? []).slice(0, 5).map((p) => (
                  <PropositionListItem key={p.id} p={p} lk={lk} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="proximas">
            <Card>
              <CardHeader>
                <CardTitle id="proximas">Próximas sessões</CardTitle>
                <Link to={`${PUBLIC_BASE}/sessoes`} className="text-sm font-medium text-primary hover:underline">
                  Calendário
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {sessions.isLoading ? (
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                  </div>
                ) : upcoming.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="Nenhuma sessão agendada" />
                ) : (
                  <ul className="divide-y">
                    {upcoming.map((s) => (
                      <li key={s.id}>
                        <Link to={`${PUBLIC_BASE}/sessoes/${s.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40">
                          <DateBlock date={s.date} />
                          <div className="min-w-0">
                            <p className="font-medium">{sessionTitle(s)}</p>
                            <p className="text-xs capitalize text-muted-foreground">
                              {formatDateLong(s.date)} · {s.startTime}
                            </p>
                            {s.status !== 'scheduled' && <p className="mt-1 text-xs font-semibold text-violet">Em realização · {SessionTypeLabel[s.type]}</p>}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <section aria-labelledby="ultimas-votacoes">
          <div className="flex items-end justify-between gap-3">
            <h2 id="ultimas-votacoes" className="font-serif text-xl font-semibold">
              Últimas votações
            </h2>
            <Link to={`${PUBLIC_BASE}/votacoes`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ver todas <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {votings.isLoading || !lk.ready ? (
            <Skeleton className="mt-4 h-40 rounded-xl" />
          ) : (votings.data ?? []).length === 0 ? (
            <EmptyState icon={Vote} title="Nenhuma votação encerrada" />
          ) : (
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {(votings.data ?? []).slice(0, 4).map((v) => (
                <VotingListItem key={v.id} v={v} p={propIndex.get(v.propositionId)} s={sessionIndex.get(v.sessionId)} lk={lk} />
              ))}
            </ul>
          )}
        </section>
      </PublicContainer>
    </>
  )
}
