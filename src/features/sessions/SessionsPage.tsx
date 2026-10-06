import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarDays, Clock, Eye, MapPin, MoreHorizontal, Pencil, Plus, Trash2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { DatePicker, NativeSelect } from '@/components/ui/form-controls'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader, Pagination, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useAction, useAreaBase, useCollection, useLookups, usePermission } from '@/hooks/useData'
import { sessionService } from '@/services/registryServices'
import { sessionLifecycle } from '@/services/plenaryService'
import { SessionStatusMeta, SessionTypeLabel } from '@/domain/labels'
import { formatDate, formatDateLong, todayISO } from '@/lib/format'
import { matches } from '@/lib/utils'
import type { Session, SessionStatus, SessionType } from '@/types'
import { SessionFormDialog } from './SessionFormDialog'
import { sessionTitle } from './utils'

export default function SessionsPage() {
  const base = useAreaBase()
  const can = usePermission()
  const query = useCollection('sessions')
  const lk = useLookups()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<'' | SessionType>('')
  const [status, setStatus] = useState<'' | SessionStatus>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<Session | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Session | null>(null)
  const [toCancel, setToCancel] = useState<Session | null>(null)

  const sessions = useMemo(() => [...(query.data ?? [])].sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)), [query.data])
  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (!type || s.type === type) &&
          (!status || s.status === status) &&
          (!from || s.date >= from) &&
          (!to || s.date <= to) &&
          matches([sessionTitle(s), `${s.number}/${s.year}`, formatDate(s.date), s.location, lk.councilorName(s.presidentId), SessionStatusMeta[s.status].label], search),
      ),
    [sessions, type, status, from, to, search, lk],
  )
  const pagination = usePagination(filtered, 10)
  const today = todayISO()
  const upcoming = sessions.filter((s) => s.status !== 'cancelled' && s.status !== 'closed' && s.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)

  const remove = useAction((id: string) => sessionService.remove(id), { success: 'Sessão excluída com sucesso.' })
  const cancel = useAction((id: string) => sessionLifecycle.setStatus(id, 'cancelled'), { success: 'Sessão cancelada.' })

  const canCreate = can('sessions', 'create')
  const canEdit = can('sessions', 'edit')
  const canDelete = can('sessions', 'delete')

  return (
    <>
      <PageHeader
        title="Sessões plenárias"
        description="Planejamento e controle das sessões ordinárias, extraordinárias, solenes, especiais e audiências públicas."
        breadcrumb={[{ label: 'Início', to: base }, { label: 'Sessões' }]}
        actions={
          canCreate && (
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> Nova sessão
            </Button>
          )
        }
      />

      {upcoming.length > 0 && (
        <section aria-labelledby="proximas" className="mb-6">
          <h2 id="proximas" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sessões em curso e próximas
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((s) => (
              <Link key={s.id} to={`${base}/sessoes/${s.id}`} className="group rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
                <Card className="h-full p-4 transition-colors group-hover:border-primary/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <CalendarClock className="size-5" aria-hidden />
                    </div>
                    <StatusBadge meta={SessionStatusMeta[s.status]} />
                  </div>
                  <p className="mt-3 font-semibold">{sessionTitle(s)}</p>
                  <p className="mt-0.5 text-sm capitalize text-muted-foreground">{formatDateLong(s.date)}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden /> {s.startTime}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{s.location}</span>
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Todas as sessões</CardTitle>
        </CardHeader>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar sessão, número, local…" />
          <NativeSelect value={type} onChange={(e) => setType(e.target.value as '' | SessionType)} className="w-auto" aria-label="Filtrar por tipo">
            <option value="">Todos os tipos</option>
            {(Object.keys(SessionTypeLabel) as SessionType[]).map((t) => (
              <option key={t} value={t}>
                {SessionTypeLabel[t]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as '' | SessionStatus)} className="w-auto" aria-label="Filtrar por situação">
            <option value="">Todas as situações</option>
            {(Object.keys(SessionStatusMeta) as SessionStatus[]).map((s) => (
              <option key={s} value={s}>
                {SessionStatusMeta[s].label}
              </option>
            ))}
          </NativeSelect>
          <div className="flex items-center gap-1.5">
            <DatePicker value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label="Data inicial" />
            <span className="text-xs text-muted-foreground">até</span>
            <DatePicker value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label="Data final" />
          </div>
        </Toolbar>
        <QueryState query={query} isEmpty={() => filtered.length === 0} empty={<EmptyState icon={CalendarDays} title="Nenhuma sessão encontrada" description="Ajuste os filtros ou cadastre uma nova sessão." />}>
          {() => (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Sessão</TH>
                    <TH>Data</TH>
                    <TH className="hidden md:table-cell">Horário</TH>
                    <TH className="hidden lg:table-cell">Presidente</TH>
                    <TH>Situação</TH>
                    <TH className="w-12">
                      <span className="sr-only">Ações</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {pagination.slice.map((s) => (
                    <TR key={s.id}>
                      <TD>
                        <Link to={`${base}/sessoes/${s.id}`} className="font-medium hover:text-primary hover:underline">
                          {SessionTypeLabel[s.type]} nº {String(s.number).padStart(2, '0')}/{s.year}
                        </Link>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">{s.location}</p>
                      </TD>
                      <TD className="tabular">{formatDate(s.date)}</TD>
                      <TD className="hidden tabular md:table-cell">
                        {s.startTime}
                        {s.endTime ? ` – ${s.endTime}` : ''}
                      </TD>
                      <TD className="hidden lg:table-cell">{lk.councilorName(s.presidentId)}</TD>
                      <TD>
                        <StatusBadge meta={SessionStatusMeta[s.status]} />
                      </TD>
                      <TD>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Ações — ${sessionTitle(s)}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem asChild>
                              <Link to={`${base}/sessoes/${s.id}`}>
                                <Eye /> Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setEditing(s)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil /> Editar
                              </DropdownMenuItem>
                            )}
                            {canEdit && s.status === 'scheduled' && (
                              <DropdownMenuItem destructive onSelect={() => setToCancel(s)}>
                                <XCircle /> Cancelar sessão
                              </DropdownMenuItem>
                            )}
                            {canDelete && (s.status === 'scheduled' || s.status === 'cancelled') && (
                              <DropdownMenuItem destructive onSelect={() => setToDelete(s)}>
                                <Trash2 /> Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </QueryState>
      </Card>

      <SessionFormDialog open={formOpen} onOpenChange={setFormOpen} session={editing} sessions={sessions} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir sessão?"
        description={toDelete ? `${sessionTitle(toDelete)} será excluída definitivamente. Esta ação será registrada na auditoria.` : ''}
        confirmLabel="Excluir"
        onConfirm={() => toDelete && remove.run(toDelete.id)}
      />
      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="Cancelar sessão?"
        description={toCancel ? `${sessionTitle(toCancel)} será marcada como cancelada.` : ''}
        confirmLabel="Cancelar sessão"
        cancelLabel="Voltar"
        onConfirm={() => toCancel && cancel.run(toCancel.id)}
      />
    </>
  )
}
