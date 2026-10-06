import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/display'
import { EmptyState } from '@/components/common/states'
import { Breadcrumb, type Crumb } from '@/components/common/page'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { useCollection, useSettings, type Lookups } from '@/hooks/useData'
import { PropositionStatusMeta, SessionTypeLabel, VotingMethodLabel } from '@/domain/labels'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Attendance, Proposition, PropositionStatus, PropositionTypeConfig, Session, Voting, VotingResult } from '@/types'

/**
 * Utilitários do Portal da Transparência (área pública, sem autenticação).
 * Regra: proposições em rascunho nunca são exibidas publicamente.
 */
export const PUBLIC_BASE = '/transparencia'

export function PublicContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10', className)}>{children}</div>
}

export function PublicPageHeader({ title, description, crumbs, actions }: { title: ReactNode; description?: ReactNode; crumbs: Crumb[]; actions?: ReactNode }) {
  return (
    <header className="mb-8 space-y-3">
      <Breadcrumb items={[{ label: 'Transparência', to: PUBLIC_BASE }, ...crumbs]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
          {description && <div className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</div>}
        </div>
        {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export const sessionTitle =(s: Pick<Session, 'type' | 'number' | 'year'>) => `Sessão ${SessionTypeLabel[s.type]} nº ${s.number}/${s.year}`

interface QueryLike<T> {
  data: T | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => unknown
}

export function usePublicPropositions(): QueryLike<Proposition[]> {
  const q = useCollection('propositions')
  const data = useMemo(() => q.data?.filter((p) => p.status !== 'draft').sort((a, b) => b.presentedAt.localeCompare(a.presentedAt) || b.number - a.number), [q.data])
  return { data, isLoading: q.isLoading, isError: q.isError, error: q.error, refetch: q.refetch }
}

export type ClosedVoting = Voting & { result: VotingResult }

/** Somente votações encerradas e apuradas são publicadas. */
export function usePublicVotings(): QueryLike<ClosedVoting[]> {
  const q = useCollection('votings')
  const data = useMemo(
    () => q.data?.filter((v): v is ClosedVoting => v.status === 'closed' && !!v.result).sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? '')),
    [q.data],
  )
  return { data, isLoading: q.isLoading, isError: q.isError, error: q.error, refetch: q.refetch }
}

export function useIndex<T extends { id: string }>(items: T[] | undefined) {
  return useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items])
}

export function useVoteLabels() {
  const { data } = useSettings()
  return data?.voting.labels ?? { yes: 'SIM', no: 'NÃO', abstention: 'ABSTENÇÃO' }
}

/* ---------- Categorias rápidas de consulta ---------- */
export type PublicCategory = 'projetos' | 'leis' | 'resolucoes' | 'decretos'
interface CategoryDef {
  label: string
  codes: string[]
  statuses?: PropositionStatus[]
}
export const CATEGORIES: Record<PublicCategory, CategoryDef> = {
  projetos: { label: 'Projetos', codes: ['PL', 'PLC', 'PDL', 'PR'] },
  leis: { label: 'Leis', codes: ['PL', 'PLC'], statuses: ['sanctioned', 'promulgated'] },
  resolucoes: { label: 'Resoluções', codes: ['PR'] },
  decretos: { label: 'Decretos Legislativos', codes: ['PDL'] },
}
export const isCategory = (v: string | null): v is PublicCategory => !!v && v in CATEGORIES

export function inCategory(p: Proposition, type: PropositionTypeConfig | undefined, cat: PublicCategory) {
  const def = CATEGORIES[cat]
  return !!type && def.codes.includes(type.code) && (!def.statuses || def.statuses.includes(p.status))
}

/** Percentual de presença considerando apenas registros efetivados. */
export function attendanceRate(rows: Attendance[]) {
  const counted = rows.filter((a) => a.status !== 'pending')
  return counted.length ? counted.filter((a) => a.status === 'present').length / counted.length : null
}

/* ---------- Componentes ---------- */
export function PublicNotFound({ title, backTo, backLabel }: { title: string; backTo: string; backLabel: string }) {
  return (
    <PublicContainer>
      <EmptyState
        icon={SearchX}
        title={title}
        description="O registro solicitado não existe ou não está disponível para consulta pública."
        action={
          <Button asChild variant="outline">
            <Link to={backTo}>
              <ArrowLeft /> {backLabel}
            </Link>
          </Button>
        }
      />
    </PublicContainer>
  )
}

export function DateBlock({ date }: { date: string }) {
  const d = new Date(`${date}T12:00:00`)
  return (
    <div className="grid w-14 shrink-0 place-items-center rounded-lg border bg-muted/50 py-1.5 text-center" aria-hidden>
      <span className="text-xl font-bold leading-none tabular">{String(d.getDate()).padStart(2, '0')}</span>
      <span className="text-[11px] font-semibold uppercase text-muted-foreground">{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
    </div>
  )
}

export function ScoreLine({ r }: { r: Pick<VotingResult, 'yes' | 'no' | 'abstention'> }) {
  const l = useVoteLabels()
  return (
    <span className="inline-flex flex-wrap gap-x-3 text-xs font-semibold tabular">
      <span className="text-success">
        {l.yes} {r.yes}
      </span>
      <span className="text-danger">
        {l.no} {r.no}
      </span>
      <span className="text-warning">
        {l.abstention} {r.abstention}
      </span>
    </span>
  )
}

export function PropositionListItem({ p, lk }: { p: Proposition; lk: Lookups }) {
  return (
    <li>
      <Link to={`${PUBLIC_BASE}/proposicoes/${p.id}`} className="group block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-primary group-hover:underline">{lk.title(p)}</span>
          <StatusBadge meta={PropositionStatusMeta[p.status]} />
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-foreground/85">{p.summary}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Autoria: {p.authorName}</span>
          <span>Apresentação: {formatDate(p.presentedAt)}</span>
          {p.subject && <span>Assunto: {p.subject}</span>}
        </p>
      </Link>
    </li>
  )
}

export function VotingListItem({ v, p, s, lk }: { v: ClosedVoting; p?: Proposition; s?: Session; lk: Lookups }) {
  return (
    <li>
      <Link to={`${PUBLIC_BASE}/votacoes/${v.id}`} className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-primary group-hover:underline">{p ? lk.title(p) : 'Matéria'}</span>
            <Badge>{VotingMethodLabel[v.method]}</Badge>
          </div>
          {p && <p className="mt-1.5 line-clamp-2 text-sm text-foreground/85">{p.summary}</p>}
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {s && <span>{sessionTitle(s)}</span>}
            <span>{formatDate(v.closedAt)}</span>
            <ScoreLine r={v.result} />
          </p>
        </div>
        <OutcomeSeal outcome={v.result.outcome} className="self-start sm:self-center" />
      </Link>
    </li>
  )
}
