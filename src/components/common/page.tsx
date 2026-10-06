import { Fragment, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Upload, FileText, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/display'
import { Input } from '@/components/ui/form-controls'
import { cn } from '@/lib/utils'
import { formatFileSize, formatNumber } from '@/lib/format'
import type { DocumentRef } from '@/types'

/* ---------- Cabeçalho de página com breadcrumb ---------- */
export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="no-print">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            <li>
              {c.to ? (
                <Link to={c.to} className="hover:text-foreground hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-foreground/80">
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

export function PageHeader({ title, description, breadcrumb, actions, children }: { title: ReactNode; description?: ReactNode; breadcrumb?: Crumb[]; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 space-y-3">
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-[1.7rem]">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

/* ---------- Indicador ---------- */
const toneMap = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-violet-soft text-violet',
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', hint, className }: { label: string; value: ReactNode; icon: ComponentType<{ className?: string }>; tone?: keyof typeof toneMap; hint?: ReactNode; className?: string }) {
  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular sm:text-3xl">{typeof value === 'number' ? formatNumber(value) : value}</p>
        </div>
        <div className={cn('grid size-10 shrink-0 place-items-center rounded-lg', toneMap[tone])}>
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

/* ---------- Barra de busca/filtros ---------- */
export function SearchInput({ value, onChange, placeholder = 'Buscar…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative min-w-0 flex-1 sm:max-w-sm', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  )
}

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('no-print flex flex-wrap items-center gap-2 border-b p-3 sm:p-4', className)}>{children}</div>
}

/* ---------- Paginação ---------- */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pages)
  const slice = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize])
  return { page: current, pages, setPage, slice, total: items.length, pageSize }
}

export function Pagination({ page, pages, setPage, total, pageSize }: ReturnType<typeof usePagination>) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav aria-label="Paginação" className="no-print flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        {from}–{to} de {formatNumber(total)}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Página anterior">
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular" aria-current="page">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon-sm" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Próxima página">
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}

/* ---------- Upload de arquivos (armazenamento simulado) ---------- */
export function FileUpload({ onFiles, accept = '.pdf,.doc,.docx,.odt,.png,.jpg', multiple = true, label = 'Arraste arquivos ou clique para selecionar', hint = 'PDF, DOC, DOCX, ODT, PNG ou JPG — até 20 MB (armazenamento simulado nesta fase)' }: { onFiles: (files: File[]) => void; accept?: string; multiple?: boolean; label?: string; hint?: string }) {
  const [drag, setDrag] = useState(false)
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        onFiles(Array.from(e.dataTransfer.files))
      }}
      className={cn('flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors hover:border-primary/50 hover:bg-primary/5', drag && 'border-primary bg-primary/5')}
    >
      <Upload className="size-6 text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []).filter((f) => f.size <= 20 * 1024 * 1024))
          e.target.value = ''
        }}
      />
    </label>
  )
}

export function DocumentList({ documents, onRemove, empty = 'Nenhum documento anexado.' }: { documents: DocumentRef[]; onRemove?: (id: string) => void; empty?: string }) {
  if (!documents.length) return <p className="py-3 text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y rounded-lg border">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-danger-soft text-danger">
            <FileText className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{d.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(d.size)} · {d.uploadedBy}
            </p>
          </div>
          {onRemove && (
            <Button variant="ghost" size="icon-sm" onClick={() => onRemove(d.id)} aria-label={`Remover ${d.name}`}>
              <Trash2 />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

/* ---------- Chips de filtro ativos ---------- */
export function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs">
      {label}
      <button onClick={onClear} className="rounded-full p-0.5 hover:bg-background" aria-label={`Remover filtro ${label}`}>
        <X className="size-3" />
      </button>
    </span>
  )
}
