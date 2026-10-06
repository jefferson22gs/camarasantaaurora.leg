import { ArrowRight, FileText, UserRound } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProcessMovement } from '@/types'

/**
 * Timeline vertical da tramitação: data, hora, origem → destino, ação, responsável, observação e documentos.
 * Reutilizada em proposições, processos, comissões e no Portal da Transparência.
 */
export function LegislativeTimeline({ movements, className, showResponsible = true, emptyText = 'Nenhuma movimentação registrada.' }: { movements: ProcessMovement[]; className?: string; showResponsible?: boolean; emptyText?: string }) {
  const ordered = [...movements].sort((a, b) => b.at.localeCompare(a.at))
  if (!ordered.length) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ol className={cn('relative', className)} aria-label="Tramitação">
      {ordered.map((m, i) => (
        <li key={m.id} className="relative grid grid-cols-[4.5rem_1.5rem_1fr] gap-x-2 pb-6 last:pb-0 sm:grid-cols-[6rem_1.5rem_1fr] sm:gap-x-3">
          <div className="pt-0.5 text-right">
            <p className="text-xs font-semibold tabular sm:text-sm">{formatDate(m.at)}</p>
            <p className="text-xs text-muted-foreground tabular">{formatTime(m.at)}</p>
          </div>
          <div className="relative flex justify-center">
            {i < ordered.length - 1 && <span className="absolute top-5 h-[calc(100%+0.25rem)] w-px bg-border" aria-hidden />}
            <span className={cn('relative mt-1 size-3.5 rounded-full border-2 border-card ring-2', i === 0 ? 'bg-primary ring-primary/30' : 'bg-muted-foreground/40 ring-border')} aria-hidden />
          </div>
          <div className="min-w-0 rounded-lg border bg-card p-3 shadow-xs">
            <p className="text-sm font-semibold">{m.action}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{m.from}</span>
              <ArrowRight className="size-3" aria-label="para" />
              <span className="font-medium text-foreground/80">{m.to}</span>
            </p>
            {m.notes && <p className="mt-2 text-sm text-foreground/80">{m.notes}</p>}
            {(showResponsible || m.documents.length > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {showResponsible && (
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3" aria-hidden /> {m.responsible}
                  </span>
                )}
                {m.documents.map((d) => (
                  <span key={d.id} className="inline-flex items-center gap-1">
                    <FileText className="size-3" aria-hidden /> {d.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
