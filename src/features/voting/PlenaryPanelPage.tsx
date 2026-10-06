import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Clock, EyeOff, Maximize, Minimize, Minus, Users, X } from 'lucide-react'
import { Crest } from '@/components/common/Brand'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { SessionStatusMeta, SessionTypeLabel, VotingMethodLabel } from '@/domain/labels'
import { useLookups, useNow } from '@/hooks/useData'
import { formatDateLong, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VoteTally } from '@/types'
import { Countdown } from './Countdown'
import { useLiveSession } from './useLiveSession'

/**
 * Painel do Plenário — telão/TV. Sem autenticação, layout fullscreen, legível à distância.
 * Sempre escuro (alto contraste em ambiente iluminado), atualizado via realtime.
 */
export default function PlenaryPanelPage() {
  const live = useLiveSession()
  const lk = useLookups()
  const now = useNow(1000)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)

  const { session, organization: org, voting, proposition, tally, settings, lastClosed } = live
  const labels = settings?.voting.labels ?? { yes: 'SIM', no: 'NÃO', abstention: 'ABSTENÇÃO' }
  // Exibe o resultado da última votação encerrada quando o item atual não tem votação aberta.
  const shown = voting?.status === 'open' ? voting : voting?.status === 'closed' ? voting : lastClosed
  const shownProp = shown ? (live.propositions.find((p) => p.id === shown.propositionId) ?? proposition) : proposition
  const shownTally: VoteTally | null = shown?.status === 'closed' && shown.result ? shown.result : shown?.id === voting?.id ? tally : null
  const mode: 'voting' | 'result' | 'item' | 'idle' = shown?.status === 'open' ? 'voting' : shown?.status === 'closed' && shown.result ? 'result' : proposition ? 'item' : 'idle'

  return (
    <div className="dark flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--brand)_45%,#0b1220),#070b14_70%)] text-white">
      {/* Cabeçalho */}
      <header className="flex items-center gap-4 border-b border-white/10 px-6 py-4 lg:px-10">
        <Crest org={org} className="size-12 lg:size-16" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold uppercase tracking-[0.12em] lg:text-2xl">{org?.name ?? 'Câmara Municipal'}</p>
          <p className="text-sm text-white/60 lg:text-lg">
            {session ? `Sessão ${SessionTypeLabel[session.type]} nº ${session.number}/${session.year}` : 'Painel do Plenário'}
            {session && ` · ${SessionStatusMeta[session.status].label}`}
          </p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="font-mono text-3xl font-bold tabular lg:text-5xl">{formatTime(now)}</p>
          <p className="text-xs capitalize text-white/55 lg:text-sm">{formatDateLong(now)}</p>
        </div>
        <div className="flex gap-1">
          <Link to="/" className="rounded-lg p-2.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Sair do painel">
            <ArrowLeft className="size-5" />
          </Link>
          <button onClick={toggleFullscreen} className="rounded-lg p-2.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
            {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-6 py-6 lg:px-10 lg:py-10" aria-live="polite">
        {live.isLoading ? (
          <p className="m-auto text-2xl text-white/60">Carregando…</p>
        ) : mode === 'idle' || !shownProp ? (
          <div className="m-auto text-center">
            <Crest org={org} className="mx-auto size-32 opacity-90 lg:size-44" />
            <p className="mt-8 text-3xl font-bold lg:text-5xl">{session ? 'Sessão em andamento' : 'Aguardando sessão'}</p>
            {session && (
              <p className="mt-4 flex items-center justify-center gap-2 text-xl text-white/70 lg:text-2xl">
                <Users className="size-6" /> {live.presentIds.length} vereadores presentes
              </p>
            )}
          </div>
        ) : (
          <>
            <section className="max-w-6xl">
              <p className="text-base font-semibold uppercase tracking-[0.2em] text-brand-2 lg:text-xl">
                {mode === 'voting' ? 'Votação em andamento' : mode === 'result' ? 'Resultado da votação' : 'Matéria em apreciação'}
                {shown && mode !== 'item' && ` · ${VotingMethodLabel[shown.method]}`}
              </p>
              <h1 className="mt-3 text-4xl font-extrabold uppercase leading-tight tracking-tight lg:text-6xl">{lk.title(shownProp)}</h1>
              <p className="mt-4 line-clamp-4 text-xl leading-snug text-white/80 lg:text-3xl">{shownProp.summary}</p>
            </section>

            {mode === 'voting' && shown && shownTally && (
              <section className="mt-auto pt-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-3 rounded-full bg-violet/25 px-5 py-2 text-xl font-bold text-violet lg:text-2xl">
                    <span className="size-3 animate-pulse rounded-full bg-violet" aria-hidden /> VOTAÇÃO EM ANDAMENTO
                  </span>
                  <Countdown voting={shown} size="xl" className="text-white" />
                </div>
                <PanelCounters tally={shownTally} labels={labels} pending />
                {shown.method === 'secret' && (
                  <p className="mt-5 flex items-center gap-2 text-lg text-white/60">
                    <EyeOff className="size-5" /> Votação secreta — votos individuais não são exibidos.
                  </p>
                )}
              </section>
            )}

            {mode === 'result' && shown?.result && (
              <section className="mt-auto pt-8">
                <div className="mb-8 flex flex-col items-center text-center">
                  <p className="text-2xl font-semibold uppercase tracking-[0.3em] text-white/70">Resultado</p>
                  <OutcomeSeal outcome={shown.result.outcome} size="xl" className="mt-4 shadow-2xl" />
                  <p className="mt-4 text-lg text-white/60">{shown.result.explanation}</p>
                </div>
                <PanelCounters tally={shown.result} labels={labels} />
              </section>
            )}

            {mode === 'item' && (
              <p className="mt-auto flex items-center gap-3 pt-8 text-2xl text-white/60">
                <Clock className="size-7" /> Aguardando abertura da votação
              </p>
            )}
          </>
        )}
      </main>
      <footer className={cn('border-t border-white/10 px-6 py-2 text-center text-xs text-white/35 lg:px-10')}>{org?.systemName} · Atualização em tempo real</footer>
    </div>
  )
}

function PanelCounters({ tally, labels, pending }: { tally: VoteTally; labels: { yes: string; no: string; abstention: string }; pending?: boolean }) {
  const items = [
    { label: labels.yes, value: tally.yes, icon: Check, cls: 'text-success', bar: 'bg-success' },
    { label: labels.no, value: tally.no, icon: X, cls: 'text-danger', bar: 'bg-danger' },
    { label: labels.abstention, value: tally.abstention, icon: Minus, cls: 'text-warning', bar: 'bg-warning' },
    { label: pending ? 'AGUARDANDO' : 'NÃO VOTARAM', value: tally.notVoted, icon: Clock, cls: 'text-white/60', bar: 'bg-white/25' },
  ]
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  return (
    <div>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:p-7">
            <dt className={cn('flex items-center gap-2 text-xl font-bold tracking-wide lg:text-3xl', i.cls)}>
              <i.icon className="size-7 lg:size-9" strokeWidth={3} aria-hidden /> {i.label}
            </dt>
            <dd className="mt-2 text-7xl font-extrabold tabular leading-none lg:text-9xl">{i.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={items.map((i) => `${i.label} ${i.value}`).join(', ')}>
        {items.map((i) => (
          <div key={i.label} className={cn('h-full transition-all duration-700', i.bar)} style={{ width: `${(i.value / total) * 100}%` }} />
        ))}
      </div>
    </div>
  )
}
