import type { ReactNode } from 'react'
import { AlertDialog as AD, Dialog as D, DropdownMenu as DM, Popover as PP, Tabs as T } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- Dialog ---------- */
export const Dialog = D.Root
export const DialogTrigger = D.Trigger
export const DialogClose = D.Close

const overlay = 'fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in'

interface DialogContentProps {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function DialogContent({ title, description, children, footer, className, size = 'md' }: DialogContentProps) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-card shadow-2xl data-[state=open]:animate-fade-in',
          sizes[size],
          className,
        )}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <D.Title className="text-base font-semibold tracking-tight">{title}</D.Title>
            {description && <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>}
          </div>
          <D.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3.5">{footer}</div>}
      </D.Content>
    </D.Portal>
  )
}

/* ---------- Sheet / Drawer ---------- */
export function SheetContent({ title, description, children, footer, side = 'right', className }: DialogContentProps & { side?: 'right' | 'left' | 'bottom' }) {
  const position = {
    right: 'inset-y-0 right-0 h-full w-full max-w-xl border-l',
    left: 'inset-y-0 left-0 h-full w-[85vw] max-w-xs border-r',
    bottom: 'inset-x-0 bottom-0 max-h-[85dvh] w-full rounded-t-2xl border-t',
  }[side]
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content className={cn('fixed z-50 flex flex-col bg-card shadow-2xl data-[state=open]:animate-fade-in', position, className)} {...(description ? {} : { 'aria-describedby': undefined })}>
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <D.Title className="text-base font-semibold">{title}</D.Title>
            {description && <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>}
          </div>
          <D.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar">
            <X className="size-4" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3.5">{footer}</div>}
      </D.Content>
    </D.Portal>
  )
}

/* ---------- Alert Dialog (confirmações) ---------- */
export const AlertDialog = AD.Root
export const AlertDialogTrigger = AD.Trigger
export const AlertDialogPrimitive = AD

/* ---------- Dropdown ---------- */
export const DropdownMenu = DM.Root
export const DropdownMenuTrigger = DM.Trigger
export function DropdownMenuContent({ children, className, align = 'end' }: { children: ReactNode; className?: string; align?: 'start' | 'end' | 'center' }) {
  return (
    <DM.Portal>
      <DM.Content align={align} sideOffset={6} className={cn('z-50 min-w-48 animate-fade-in overflow-hidden rounded-lg border bg-popover p-1 shadow-lg', className)}>
        {children}
      </DM.Content>
    </DM.Portal>
  )
}
export function DropdownMenuItem({ className, destructive, ...props }: DM.DropdownMenuItemProps & { destructive?: boolean }) {
  return (
    <DM.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground',
        destructive && 'text-danger [&_svg]:text-danger',
        className,
      )}
      {...props}
    />
  )
}
export const DropdownMenuLabel = ({ className, ...p }: DM.DropdownMenuLabelProps) => <DM.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className)} {...p} />
export const DropdownMenuSeparator = () => <DM.Separator className="my-1 h-px bg-border" />

/* ---------- Popover ---------- */
export const Popover = PP.Root
export const PopoverTrigger = PP.Trigger
export function PopoverContent({ children, className, align = 'end' }: { children: ReactNode; className?: string; align?: 'start' | 'end' | 'center' }) {
  return (
    <PP.Portal>
      <PP.Content align={align} sideOffset={8} collisionPadding={12} className={cn('z-50 w-80 animate-fade-in rounded-xl border bg-popover shadow-xl outline-none', className)}>
        {children}
      </PP.Content>
    </PP.Portal>
  )
}

/* ---------- Tabs ---------- */
export const Tabs = T.Root
export const TabsContent = ({ className, ...p }: T.TabsContentProps) => <T.Content className={cn('mt-5 outline-none', className)} {...p} />
export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn('flex w-full gap-1 overflow-x-auto border-b scrollbar-thin', className)} {...p} />
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return (
    <T.Trigger
      className={cn(
        '-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground [&_svg]:size-4',
        className,
      )}
      {...p}
    />
  )
}
