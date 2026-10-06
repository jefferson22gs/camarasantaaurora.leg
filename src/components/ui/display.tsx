import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { Avatar as AvatarPrimitive, Progress as ProgressPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import type { Tone } from '@/domain/labels'

/* ---------- Card ---------- */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)} {...props} />
}
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4', className)} {...props} />
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[15px] font-semibold tracking-tight', className)} {...props} />
}
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-sm text-muted-foreground', className)} {...props} />
}
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

/* ---------- Badge ---------- */
const toneClasses: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  info: 'bg-info-soft text-info border-info/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-[color-mix(in_oklch,var(--warning)_70%,black)] dark:text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  accent: 'bg-violet-soft text-violet border-violet/20',
}

export const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3', {
  variants: { tone: toneClasses },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({ className, tone, dot, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {props.children}
    </span>
  )
}

/** Badge de status a partir dos metadados centralizados em domain/labels. */
export function StatusBadge({ meta, className }: { meta: { label: string; tone: Tone }; className?: string }) {
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  )
}

/* ---------- Alert ---------- */
const alertIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle }
export function Alert({ tone = 'info', title, children, className, action }: { tone?: keyof typeof alertIcons; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const Icon = alertIcons[tone]
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border p-3.5 text-sm', toneClasses[tone], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-foreground">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn('text-foreground/80', title && 'mt-0.5')}>{children}</div>}
      </div>
      {action}
    </div>
  )
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden {...props} />
}

/* ---------- Avatar ---------- */
export function Avatar({ name, src, className, color }: { name: string; src?: string; className?: string; color?: string }) {
  return (
    <AvatarPrimitive.Root className={cn('relative inline-flex size-9 shrink-0 overflow-hidden rounded-full', className)}>
      {src && <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />}
      <AvatarPrimitive.Fallback
        className="grid size-full place-items-center text-[0.8em] font-semibold text-white"
        style={{ background: color ? `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 60%, black))` : 'var(--brand)' }}
        aria-label={name}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

/* ---------- Progress ---------- */
export function Progress({ value, className, indicatorClassName, label }: { value: number; className?: string; indicatorClassName?: string; label?: string }) {
  return (
    <ProgressPrimitive.Root value={value} aria-label={label} className={cn('relative h-2 overflow-hidden rounded-full bg-muted', className)}>
      <ProgressPrimitive.Indicator className={cn('h-full bg-primary transition-all duration-500', indicatorClassName)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </ProgressPrimitive.Root>
  )
}

/* ---------- Tooltip ---------- */
export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className="z-50 max-w-xs animate-fade-in rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md">
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
export const TooltipProvider = TooltipPrimitive.Provider

/* ---------- Table ---------- */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto scrollbar-thin">
      <table className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  )
}
export const THead = ({ className, ...p }: HTMLAttributes<HTMLTableSectionElement>) => <thead className={cn('bg-muted/50 [&_tr]:border-b', className)} {...p} />
export const TBody = ({ className, ...p }: HTMLAttributes<HTMLTableSectionElement>) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...p} />
export const TR = ({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) => <tr className={cn('border-b transition-colors hover:bg-muted/40', className)} {...p} />
export const TH = ({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th scope="col" className={cn('h-10 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)} {...p} />
)
export const TD = ({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-4 py-3 align-middle', className)} {...p} />

/* ---------- Separator ---------- */
export const Separator = ({ className }: { className?: string }) => <div role="separator" className={cn('h-px w-full bg-border', className)} />

/* ---------- Key/Value ---------- */
export function DescriptionList({ items, className, columns = 2 }: { items: Array<{ label: ReactNode; value: ReactNode; full?: boolean }>; className?: string; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((it, i) => (
        <div key={i} className={cn('min-w-0', it.full && 'sm:col-span-full')}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{it.label}</dt>
          <dd className="mt-1 break-words text-sm">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
