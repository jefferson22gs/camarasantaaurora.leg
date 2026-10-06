import { Check, Clock, Minus, X } from 'lucide-react'
import { OUTCOME_LABEL } from '@/domain/voting/votingEngine'
import { useSettings } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import type { VoteTally, VotingOutcome } from '@/types'

const OUTCOME_CLASS: Record<VotingOutcome, string> = {
  approved: 'bg-success text-white dark:text-background',
  rejected: 'bg-danger text-white dark:text-background',
  tie: 'bg-warning text-black',
  no_quorum: 'bg-muted-foreground text-background',
}

/** Selo do resultado (APROVADO / REJEITADO / EMPATE / SEM QUÓRUM). */
export function OutcomeSeal({ outcome, size = 'md', className }: { outcome: VotingOutcome; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1 text-sm', lg: 'px-5 py-2 text-xl', xl: 'px-10 py-4 text-5xl lg:text-7xl' }
  return <span className={cn('inline-flex items-center rounded-lg font-extrabold tracking-wider', OUTCOME_CLASS[outcome], sizes[size], className)}>{OUTCOME_LABEL[outcome]}</span>
}

/** Contadores SIM / NÃO / ABSTENÇÃO / AGUARDANDO com barra proporcional. Texto + ícone + cor (acessível). */
export function VotingSummary({ tally, size = 'md', showPending = true, className }: { tally: Pick<VoteTally, 'yes' | 'no' | 'abstention' | 'notVoted'>; size?: 'md' | 'xl'; showPending?: boolean; className?: string }) {
  const { data: settings } = useSettings()
  const labels = settings?.voting.labels ?? { yes: 'SIM', no: 'NÃO', abstention: 'ABSTENÇÃO' }
  const items = [
    { key: 'yes', label: labels.yes, value: tally.yes, icon: Check, cls: 'text-success', bar: 'bg-success' },
    { key: 'no', label: labels.no, value: tally.no, icon: X, cls: 'text-danger', bar: 'bg-danger' },
    { key: 'abstention', label: labels.abstention, value: tally.abstention, icon: Minus, cls: 'text-warning', bar: 'bg-warning' },
    ...(showPending ? [{ key: 'pending', label: 'AGUARDANDO', value: tally.notVoted, icon: Clock, cls: 'text-muted-foreground', bar: 'bg-muted-foreground/30' }] : []),
  ]
  const total = items.reduce((s, i) => s + i.value, 0) || 1
  const xl = size === 'xl'
  return (
    <div className={className}>
      <dl className={cn('grid gap-3', showPending ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
        {items.map((i) => (
          <div key={i.key} className={cn('rounded-xl border bg-card', xl ? 'p-5 lg:p-7' : 'p-3.5')}>
            <dt className={cn('flex items-center gap-1.5 font-semibold tracking-wide', i.cls, xl ? 'text-lg lg:text-2xl' : 'text-xs')}>
              <i.icon className={xl ? 'size-6 lg:size-8' : 'size-4'} aria-hidden /> {i.label}
            </dt>
            <dd className={cn('font-extrabold tabular leading-none', xl ? 'mt-3 text-6xl lg:text-8xl' : 'mt-1.5 text-3xl')} aria-live="polite">
              {i.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className={cn('mt-4 flex overflow-hidden rounded-full bg-muted', xl ? 'h-5' : 'h-2.5')} role="img" aria-label={items.map((i) => `${i.label}: ${i.value}`).join(', ')}>
        {items.map((i) => (
          <div key={i.key} className={cn('h-full transition-all duration-700', i.bar)} style={{ width: `${(i.value / total) * 100}%` }} />
        ))}
      </div>
    </div>
  )
}
