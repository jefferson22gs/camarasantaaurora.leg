import { Timer } from 'lucide-react'
import { getRemainingSeconds } from '@/domain/voting/votingEngine'
import { useNow } from '@/hooks/useData'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Voting } from '@/types'

/** Cronômetro regressivo da votação. */
export function Countdown({ voting, size = 'md', className }: { voting: Pick<Voting, 'closesAt' | 'status' | 'durationSeconds'>; size?: 'md' | 'lg' | 'xl'; className?: string }) {
  const now = useNow(500)
  const remaining = getRemainingSeconds(voting, now)
  const pct = voting.durationSeconds ? (remaining / voting.durationSeconds) * 100 : 0
  const critical = voting.status === 'open' && remaining <= 15
  return (
    <div className={cn('flex items-center gap-2.5', className)} role="timer" aria-label={`Tempo restante ${formatDuration(remaining)}`}>
      <Timer className={cn(size === 'xl' ? 'size-10' : size === 'lg' ? 'size-6' : 'size-4', critical ? 'text-danger' : 'text-muted-foreground')} aria-hidden />
      <div>
        <p className={cn('font-mono font-bold tabular leading-none', size === 'xl' ? 'text-6xl lg:text-7xl' : size === 'lg' ? 'text-3xl' : 'text-lg', critical && 'animate-pulse text-danger')}>
          {voting.status === 'open' ? formatDuration(remaining) : '--:--'}
        </p>
        {size !== 'xl' && (
          <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full transition-all duration-500', critical ? 'bg-danger' : 'bg-primary')} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}
