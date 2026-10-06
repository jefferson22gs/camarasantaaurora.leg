import type { ComponentType, ReactNode } from 'react'
import { AlertOctagon, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, Skeleton } from '@/components/ui/display'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Não foi possível carregar os dados', error, onRetry, className }: { title?: string; error?: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertOctagon className="size-6" aria-hidden />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Tente novamente em instantes.'}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw /> Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((__, j) => (
            <Skeleton key={j} className={cn('h-6', j === 1 ? 'flex-[3]' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando página">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Card>
        <TableSkeleton />
      </Card>
    </div>
  )
}

/**
 * Renderização padronizada dos estados loading/error/empty/success.
 * Uso: <QueryState query={q} empty={…}>{(data) => …}</QueryState>
 */
export function QueryState<T>({
  query,
  children,
  isEmpty,
  empty,
  loading,
}: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown }
  children: (data: T) => ReactNode
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  loading?: ReactNode
}) {
  if (query.isLoading) return <>{loading ?? <TableSkeleton />}</>
  if (query.isError || query.data === undefined) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState title="Nenhum registro encontrado" />}</>
  return <>{children(query.data)}</>
}
