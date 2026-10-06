import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, Badge } from '@/components/ui/display'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay'
import { useCollection } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore, type ThemePreference } from '@/stores/uiStore'
import { authService } from '@/services/authService'
import { notificationService } from '@/services/activity'
import { ROLES } from '@/domain/auth/permissions'
import { NotificationCategoryLabel } from '@/domain/labels'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Notification, User } from '@/types'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useUiStore()
  const Current = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Alterar tema">
          <Current />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-36">
        {THEME_OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => setTheme(o.value)} className={cn(theme === o.value && 'font-semibold')}>
            <o.icon /> {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function visibleNotifications(all: Notification[] | undefined, user: User | null) {
  if (!all || !user) return []
  return all.filter((n) => n.targetRoles.length === 0 || n.targetRoles.includes(user.role)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function NotificationBell() {
  const user = useAuthStore((s) => s.user)
  const { data } = useCollection('notifications')
  const items = useMemo(() => visibleNotifications(data, user), [data, user])
  const unread = items.filter((n) => user && !n.readBy.includes(user.id))
  const navigate = useNavigate()
  const listPath = user?.role === 'councilor' ? '/vereador/notificacoes' : '/admin/notificacoes'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificações${unread.length ? `, ${unread.length} não lidas` : ''}`}>
          <Bell />
          {unread.length > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{unread.length > 9 ? '9+' : unread.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notificações</p>
          {unread.length > 0 && user && (
            <Button variant="ghost" size="sm" onClick={() => notificationService.markRead(unread.map((n) => n.id), user.id).then(() => toast.success('Notificações marcadas como lidas.'))}>
              <CheckCheck /> Marcar todas
            </Button>
          )}
        </div>
        <ul className="max-h-96 divide-y overflow-y-auto">
          {items.slice(0, 6).map((n) => {
            const isUnread = user && !n.readBy.includes(user.id)
            return (
              <li key={n.id}>
                <button
                  className="flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/60"
                  onClick={() => {
                    if (user && isUnread) notificationService.markRead([n.id], user.id)
                    if (n.link) navigate(n.link)
                  }}
                >
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', isUnread ? 'bg-primary' : 'bg-transparent')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn('truncate text-sm', isUnread && 'font-semibold')}>{n.title}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge className="px-1.5 py-0 text-[10px]">{NotificationCategoryLabel[n.category]}</Badge>
                      {formatRelative(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
          {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Sem notificações.</li>}
        </ul>
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full" asChild>
            <Link to={listPath}>Ver todas as notificações</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  if (!user) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-0.5 pr-1 hover:bg-muted sm:pr-2.5" aria-label="Menu do usuário">
          <Avatar name={user.name} className="size-8" />
          <span className="hidden text-left leading-tight lg:block">
            <span className="block max-w-36 truncate text-sm font-medium">{user.name}</span>
            <span className="block text-[11px] text-muted-foreground">{ROLES[user.role].name}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-foreground">{user.name}</span>
          <span className="block truncate">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'councilor' && (
          <DropdownMenuItem onSelect={() => navigate('/vereador/perfil')}>
            <UserRound /> Meu perfil
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          destructive
          onSelect={async () => {
            await authService.signOut()
            navigate('/login')
          }}
        >
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
