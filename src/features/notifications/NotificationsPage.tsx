import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, Badge, Card } from '@/components/ui/display'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { PageHeader, Pagination, usePagination } from '@/components/common/page'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, QueryState } from '@/components/common/states'
import { visibleNotifications } from '@/components/layout/HeaderControls'
import { useAreaBase, useCollection, useSettings } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { notificationService } from '@/services/activity'
import { NotificationCategoryLabel } from '@/domain/labels'
import { formatDateTimeShort, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NotificationCategory } from '@/types'

type Filter = 'all' | 'unread' | NotificationCategory
const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'unread', label: 'Não lidas' },
  { key: 'system', label: 'Sistema' },
  { key: 'session', label: 'Sessões' },
  { key: 'proposition', label: 'Proposições' },
  { key: 'voting', label: 'Votações' },
]
const CATEGORY_TONE = { system: 'neutral', session: 'info', proposition: 'primary', voting: 'accent' } as const
const CHANNEL_LABEL = { system: 'Sistema', email: 'E-mail', app: 'Aplicativo', whatsapp: 'WhatsApp' } as const

export default function NotificationsPage() {
  const query = useCollection('notifications')
  const user = useAuthStore((s) => s.user)
  const { data: settings } = useSettings()
  const base = useAreaBase()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')

  const all = useMemo(() => visibleNotifications(query.data, user), [query.data, user])
  const isUnread = (readBy: string[]) => !!user && !readBy.includes(user.id)
  const rows = all.filter((n) => (filter === 'all' ? true : filter === 'unread' ? isUnread(n.readBy) : n.category === filter))
  const unread = all.filter((n) => isUnread(n.readBy))
  const pagination = usePagination(rows, 12)
  const channels = settings ? (Object.keys(CHANNEL_LABEL) as Array<keyof typeof CHANNEL_LABEL>).filter((c) => settings.notifications.channels[c]).map((c) => CHANNEL_LABEL[c]) : []

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Início', to: `${base}/dashboard` }, { label: 'Notificações' }]}
        title="Notificações"
        description={`${unread.length} não lida(s) de ${all.length}.`}
        actions={
          unread.length > 0 &&
          user && (
            <Button variant="outline" onClick={() => notificationService.markRead(unread.map((n) => n.id), user.id).then(() => toast.success('Todas as notificações foram marcadas como lidas.'))}>
              <CheckCheck /> Marcar todas como lidas
            </Button>
          )
        }
      />
      {channels.length > 0 && (
        <Alert tone="info" className="mb-5">
          Canais de envio configurados: <strong>{channels.join(', ')}</strong>. Nesta fase apenas as notificações internas do sistema são exibidas; e-mail, aplicativo e WhatsApp dependerão de integração no backend.
        </Alert>
      )}
      <Card>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="px-3">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.key} value={f.key}>
                {f.label}
                {f.key === 'unread' && unread.length > 0 && <Badge tone="primary" className="px-1.5 py-0">{unread.length}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <QueryState query={query} isEmpty={() => rows.length === 0} empty={<EmptyState icon={Bell} title="Nenhuma notificação" description="Não há notificações para o filtro selecionado." />}>
          {() => (
            <>
              <ul className="divide-y">
                {pagination.slice.map((n) => {
                  const un = isUnread(n.readBy)
                  return (
                    <li key={n.id} className={cn('flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-5', un && 'bg-primary/[0.03]')}>
                      <span className={cn('mt-1.5 hidden size-2.5 shrink-0 rounded-full sm:block', un ? 'bg-primary' : 'bg-border')} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn('text-sm', un ? 'font-semibold' : 'font-medium')}>{n.title}</p>
                          <Badge tone={CATEGORY_TONE[n.category]}>{NotificationCategoryLabel[n.category]}</Badge>
                          {un && <span className="sr-only">Não lida</span>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground" title={formatDateTimeShort(n.createdAt)}>
                          {formatRelative(n.createdAt)} · {formatDateTimeShort(n.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {n.link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (un && user) notificationService.markRead([n.id], user.id)
                              navigate(user?.role === 'councilor' && n.link?.startsWith('/admin') ? '/vereador/dashboard' : n.link!)
                            }}
                          >
                            <ExternalLink /> Abrir
                          </Button>
                        )}
                        {un && user && (
                          <Button variant="ghost" size="sm" onClick={() => notificationService.markRead([n.id], user.id)}>
                            <CheckCheck /> Lida
                          </Button>
                        )}
                        {user?.role === 'admin' && (
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label="Excluir notificação">
                                <Trash2 />
                              </Button>
                            }
                            title="Excluir notificação?"
                            description="A notificação será removida para todos os usuários."
                            confirmLabel="Excluir"
                            onConfirm={() => notificationService.remove(n.id).then(() => toast.success('Notificação excluída.'))}
                          />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <Pagination {...pagination} />
            </>
          )}
        </QueryState>
      </Card>
    </>
  )
}
