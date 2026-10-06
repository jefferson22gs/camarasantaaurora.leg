import { Check, FileText, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/display'
import { formatDate, formatDateTimeShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { LegislativeProcess, ProcessStep } from '@/types'

const STATE_LABEL: Record<ProcessStep['state'], string> = { done: 'Concluída', current: 'Etapa atual', pending: 'Pendente' }

function currentInfo(process: LegislativeProcess) {
  const index = process.steps.findIndex((s) => s.state === 'current')
  return { index, label: index >= 0 ? process.steps[index].label : 'Concluído' }
}

/** Barra segmentada compacta (listas). */
export function CompactStepper({ process, className }: { process: LegislativeProcess; className?: string }) {
  const { index, label } = currentInfo(process)
  return (
    <div
      className={cn('flex gap-0.5', className)}
      role="img"
      aria-label={index >= 0 ? `Etapa atual: ${label} (${index + 1} de ${process.steps.length})` : 'Tramitação concluída'}
    >
      {process.steps.map((s) => (
        <span
          key={s.stage}
          title={`${s.label} — ${STATE_LABEL[s.state]}`}
          className={cn('h-1.5 flex-1 rounded-full', s.state === 'done' && 'bg-primary', s.state === 'current' && 'bg-accent', s.state === 'pending' && 'bg-muted')}
        />
      ))}
    </div>
  )
}

/** Stepper horizontal com rótulos (visão geral da proposição). */
export function HorizontalStepper({ process }: { process: LegislativeProcess }) {
  return (
    <ol className="flex overflow-x-auto pb-2 scrollbar-thin" aria-label="Etapas do processo legislativo">
      {process.steps.map((s, i) => (
        <li key={s.stage} className="relative flex min-w-24 flex-1 flex-col items-center px-1 text-center" aria-current={s.state === 'current' ? 'step' : undefined}>
          {i > 0 && <span className={cn('absolute right-1/2 top-3.5 h-0.5 w-full', s.state === 'pending' ? 'bg-border' : 'bg-primary')} aria-hidden />}
          <span
            className={cn(
              'relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-semibold',
              s.state === 'done' && 'border-primary bg-primary text-primary-foreground',
              s.state === 'current' && 'border-accent bg-card text-accent ring-4 ring-accent/20',
              s.state === 'pending' && 'border-border bg-card text-muted-foreground',
            )}
          >
            {s.state === 'done' ? <Check className="size-3.5" aria-hidden /> : i + 1}
          </span>
          <span className={cn('mt-1.5 text-xs leading-tight', s.state === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{s.label}</span>
          {s.startedAt && <span className="text-[10px] text-muted-foreground tabular">{formatDate(s.startedAt)}</span>}
          <span className="sr-only">{STATE_LABEL[s.state]}</span>
        </li>
      ))}
    </ol>
  )
}

/** Stepper vertical detalhado: etapa, unidade, responsável, datas, observações e documentos. */
export function VerticalStepper({ process }: { process: LegislativeProcess }) {
  return (
    <ol className="space-y-0" aria-label="Etapas do processo legislativo">
      {process.steps.map((s, i) => (
        <li key={s.stage} className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0" aria-current={s.state === 'current' ? 'step' : undefined}>
          {i < process.steps.length - 1 && <span className={cn('absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5', s.state === 'done' ? 'bg-primary' : 'bg-border')} aria-hidden />}
          <span
            className={cn(
              'relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-semibold',
              s.state === 'done' && 'border-primary bg-primary text-primary-foreground',
              s.state === 'current' && 'border-accent bg-card text-accent ring-4 ring-accent/20',
              s.state === 'pending' && 'border-border bg-card text-muted-foreground',
            )}
          >
            {s.state === 'done' ? <Check className="size-4" aria-hidden /> : i + 1}
          </span>
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn('text-sm font-semibold', s.state === 'pending' && 'text-muted-foreground')}>{s.label}</p>
              <Badge tone={s.state === 'done' ? 'success' : s.state === 'current' ? 'accent' : 'neutral'}>{STATE_LABEL[s.state]}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {s.unit}
              {s.startedAt && ` · ${formatDateTimeShort(s.startedAt)}`}
              {s.responsible && (
                <span className="ml-1 inline-flex items-center gap-1">
                  · <UserRound className="size-3" aria-hidden /> {s.responsible}
                </span>
              )}
            </p>
            {s.state === 'pending' && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
            {s.movements.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {s.movements.map((m) => (
                  <li key={m.id} className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">
                      {m.action} <span className="font-normal text-muted-foreground">· {formatDateTimeShort(m.at)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {m.from} → {m.to}
                    </p>
                    {m.notes && <p className="mt-1 text-foreground/80">{m.notes}</p>}
                    {m.documents.map((d) => (
                      <p key={d.id} className="mt-1 inline-flex items-center gap-1 text-muted-foreground">
                        <FileText className="size-3" aria-hidden /> {d.name}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
