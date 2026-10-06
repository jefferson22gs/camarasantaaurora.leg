import { useState, type ReactNode } from 'react'
import { AlertDialogPrimitive as AD } from '@/components/ui/overlay'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/form-controls'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning' | 'default'
  /** Exige justificativa (ex.: anulação de votação). */
  requireReason?: boolean
  reasonLabel?: string
  onConfirm: (reason: string) => unknown | Promise<unknown>
}

/** Confirmação obrigatória para operações críticas/destrutivas. */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  requireReason,
  reasonLabel = 'Justificativa',
  onConfirm,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const isOpen = open ?? internalOpen
  const setOpen = (v: boolean) => {
    if (!v) setReason('')
    onOpenChange?.(v)
    setInternalOpen(v)
  }

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm(reason.trim())
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AD.Root open={isOpen} onOpenChange={setOpen}>
      {trigger && <AD.Trigger asChild>{trigger}</AD.Trigger>}
      <AD.Portal>
        <AD.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <AD.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-2xl data-[state=open]:animate-fade-in">
          <div className="flex gap-4">
            <div
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full',
                tone === 'danger' && 'bg-danger-soft text-danger',
                tone === 'warning' && 'bg-warning-soft text-warning',
                tone === 'default' && 'bg-primary/10 text-primary',
              )}
            >
              <AlertTriangle className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <AD.Title className="text-base font-semibold">{title}</AD.Title>
              <AD.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</AD.Description>
            </div>
          </div>
          {requireReason && (
            <Field label={reasonLabel} required className="mt-5">
              {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo (registrado na auditoria)" className="min-h-20" autoFocus />}
            </Field>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AD.Cancel asChild>
              <Button variant="outline">{cancelLabel}</Button>
            </AD.Cancel>
            <Button variant={tone === 'danger' ? 'destructive' : tone === 'warning' ? 'warning' : 'default'} onClick={confirm} loading={busy} disabled={requireReason && reason.trim().length < 5}>
              {confirmLabel}
            </Button>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  )
}
