import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ClipboardList, GripVertical, Plus, Printer, Save, Send, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Badge, Card, CardHeader, CardTitle, StatusBadge } from '@/components/ui/display'
import { NativeSelect } from '@/components/ui/form-controls'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/page'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { useAction, useAreaBase, useCollection, useLookups, useOrganization, usePermission, useSettings } from '@/hooks/useData'
import { agendaService } from '@/services/plenaryService'
import { AgendaItemStatusMeta, OpinionConclusionMeta, RegimeLabel, SessionStatusMeta, SessionTypeLabel, VotingMethodLabel } from '@/domain/labels'
import { formatDate, formatDateLong, formatDateTimeShort, todayISO } from '@/lib/format'
import { cn, uid } from '@/lib/utils'
import type { AgendaItem, AgendaSection, Session, VotingMethod } from '@/types'
import { isSessionFinished, sessionTitle } from '@/features/sessions/utils'
import { AddItemsDialog } from './AddItemsDialog'

const SECTION_LABEL: Record<AgendaSection, string> = { expedient: 'Expediente', order_of_day: 'Ordem do Dia' }

/** Sessão padrão: aberta/em andamento; senão a próxima agendada; senão a mais recente. */
function defaultSession(sessions: Session[]) {
  const today = todayISO()
  return (
    sessions.find((s) => s.status === 'open' || s.status === 'in_progress' || s.status === 'suspended') ??
    [...sessions].filter((s) => s.status === 'scheduled' && s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ??
    [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0]
  )
}

export default function AgendasPage() {
  const base = useAreaBase()
  const can = usePermission()
  const lk = useLookups()
  const { data: settings } = useSettings()
  const { data: org } = useOrganization()
  const sessions = useCollection('sessions')
  const agendas = useCollection('agendas')
  const propositions = useCollection('propositions')
  const opinions = useCollection('opinions')

  const [sessionId, setSessionId] = useState('')
  const [items, setItems] = useState<AgendaItem[]>([])
  const [dirty, setDirty] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [toRemove, setToRemove] = useState<AgendaItem | null>(null)
  const [confirmPublish, setConfirmPublish] = useState(false)

  const sortedSessions = useMemo(() => [...(sessions.data ?? [])].filter((s) => s.status !== 'cancelled').sort((a, b) => b.date.localeCompare(a.date)), [sessions.data])
  const session = sortedSessions.find((s) => s.id === sessionId)
  const agenda = (agendas.data ?? []).find((a) => a.sessionId === sessionId)
  const propMap = useMemo(() => new Map((propositions.data ?? []).map((p) => [p.id, p])), [propositions.data])

  useEffect(() => {
    if (!sessionId && sortedSessions.length) setSessionId(defaultSession(sortedSessions)?.id ?? '')
  }, [sessionId, sortedSessions])

  // Sincroniza o rascunho local quando a pauta persistida muda e não há edição pendente.
  useEffect(() => {
    if (!dirty) setItems([...(agenda?.items ?? [])].sort((a, b) => a.order - b.order))
  }, [agenda, dirty])

  const editable = can('agendas', 'edit') && !!session && !isSessionFinished(session.status)
  const locked = (i: AgendaItem) => i.status === 'voted' || i.status === 'voting'

  const save = useAction(() => agendaService.save(sessionId, items), { success: 'Pauta salva com sucesso.', onSuccess: () => setDirty(false) })
  const publish = useAction(
    async () => {
      if (dirty) await agendaService.save(sessionId, items)
      await agendaService.publish(sessionId)
    },
    { success: 'Pauta publicada.', onSuccess: () => setDirty(false) },
  )

  function update(next: AgendaItem[]) {
    setItems(next.map((i, idx) => ({ ...i, order: idx + 1 })))
    setDirty(true)
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    if (locked(items[from]) || locked(items[to])) return
    const next = [...items]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    update(next)
  }

  function patchItem(id: string, patch: Partial<AgendaItem>) {
    update(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function addPropositions(ids: string[]) {
    const added = ids.map<AgendaItem>((pid) => {
      const p = propMap.get(pid)!
      return { id: uid('ai'), order: 0, propositionId: pid, section: 'order_of_day', status: 'pending', votingMethod: p.votingMethod, quorumRuleId: p.quorumRuleId, notes: '' }
    })
    update([...items, ...added])
  }

  if (sessions.isLoading || agendas.isLoading || propositions.isLoading) return <PageSkeleton />

  const opinionsFor = (pid: string) => (opinions.data ?? []).filter((o) => o.propositionId === pid && o.status === 'completed' && o.conclusion)

  return (
    <>
      <PageHeader
        title="Pauta da sessão"
        description="Monte, ordene e publique a pauta. Arraste os itens ou use os botões para reordenar."
        breadcrumb={[{ label: 'Início', to: base }, { label: 'Pautas' }]}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()} disabled={!items.length}>
              <Printer /> Imprimir
            </Button>
            {editable && (
              <>
                <Button variant="outline" onClick={() => setAdding(true)}>
                  <Plus /> Adicionar matérias
                </Button>
                {dirty && (
                  <Button variant="ghost" onClick={() => setDirty(false)}>
                    <Undo2 /> Descartar
                  </Button>
                )}
                <Button variant="secondary" onClick={() => save.run()} loading={save.pending} disabled={!dirty}>
                  <Save /> Salvar
                </Button>
                {can('agendas', 'approve') || can('agendas', 'edit') ? (
                  <Button onClick={() => setConfirmPublish(true)} disabled={!items.length || (agenda?.status === 'published' && !dirty)}>
                    <Send /> {agenda?.status === 'published' ? 'Republicar' : 'Publicar'}
                  </Button>
                ) : null}
              </>
            )}
          </>
        }
      />

      <Card className="no-print mb-5 flex flex-wrap items-center gap-3 p-4">
        <label htmlFor="agenda-session" className="text-sm font-medium">
          Sessão
        </label>
        <NativeSelect
          id="agenda-session"
          value={sessionId}
          onChange={(e) => {
            if (dirty && !window.confirm('Há alterações não salvas. Deseja descartá-las?')) return
            setDirty(false)
            setSessionId(e.target.value)
          }}
          className="w-full sm:w-auto sm:min-w-80"
        >
          {sortedSessions.map((s) => (
            <option key={s.id} value={s.id}>
              {SessionTypeLabel[s.type]} nº {s.number}/{s.year} — {formatDate(s.date)} ({SessionStatusMeta[s.status].label})
            </option>
          ))}
        </NativeSelect>
        {session && <StatusBadge meta={SessionStatusMeta[session.status]} />}
        {agenda && <Badge tone={agenda.status === 'published' ? 'success' : 'warning'}>{agenda.status === 'published' ? `Publicada em ${formatDateTimeShort(agenda.publishedAt)}` : 'Rascunho'}</Badge>}
        {session && (
          <Link to={`${base}/sessoes/${session.id}`} className="ml-auto text-sm text-primary hover:underline">
            Ver sessão
          </Link>
        )}
      </Card>

      {dirty && (
        <Alert tone="warning" className="no-print mb-4" title="Alterações não salvas">
          Salve a pauta para registrar as mudanças{agenda?.status === 'published' ? ' — por ser uma pauta publicada, os vereadores serão notificados da alteração' : ''}.
        </Alert>
      )}
      {session && isSessionFinished(session.status) && (
        <Alert tone="info" className="no-print mb-4">
          Sessão {SessionStatusMeta[session.status].label.toLowerCase()}: a pauta está disponível apenas para consulta.
        </Alert>
      )}

      {/* Cabeçalho de impressão */}
      {session && (
        <div className="print-only mb-6 text-center">
          <p className="text-sm font-semibold uppercase">{org?.name}</p>
          <p className="mt-1 text-lg font-bold uppercase">{settings?.documents.agendaHeader}</p>
          <p className="text-sm">
            {sessionTitle(session)} — <span className="capitalize">{formatDateLong(session.date)}</span>, às {session.startTime} — {session.location}
          </p>
        </div>
      )}

      <Card className="print-plain">
        <CardHeader className="no-print">
          <CardTitle>
            Itens da pauta <span className="font-normal text-muted-foreground">({items.length})</span>
          </CardTitle>
        </CardHeader>
        {!session ? (
          <EmptyState icon={ClipboardList} title="Nenhuma sessão disponível" description="Cadastre uma sessão para elaborar a pauta." />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Pauta sem itens"
            description="Adicione as matérias que serão apreciadas nesta sessão."
            action={
              editable && (
                <Button onClick={() => setAdding(true)}>
                  <Plus /> Adicionar matérias
                </Button>
              )
            }
          />
        ) : (
          <ol className="divide-y" aria-label="Itens da pauta">
            {items.map((item, index) => {
              const p = propMap.get(item.propositionId)
              const type = p ? lk.types.get(p.typeId) : undefined
              const committee = p?.committeeIds.map((c) => lk.committees.get(c)?.acronym).filter(Boolean).join(', ')
              const ops = opinionsFor(item.propositionId)
              const itemLocked = !editable || locked(item)
              return (
                <li
                  key={item.id}
                  draggable={!itemLocked}
                  onDragStart={(e) => {
                    setDragIndex(index)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return
                    e.preventDefault()
                    setOverIndex(index)
                  }}
                  onDragLeave={() => setOverIndex((o) => (o === index ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragIndex !== null) move(dragIndex, index)
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                  onDragEnd={() => {
                    setDragIndex(null)
                    setOverIndex(null)
                  }}
                  className={cn('flex gap-3 p-4 transition-colors', dragIndex === index && 'opacity-50', overIndex === index && dragIndex !== index && 'bg-primary/5 ring-2 ring-inset ring-primary/40')}
                >
                  <div className="no-print flex flex-col items-center gap-1">
                    {!itemLocked ? (
                      <>
                        <GripVertical className="size-5 cursor-grab text-muted-foreground active:cursor-grabbing" aria-hidden />
                        <Button variant="ghost" size="icon-sm" onClick={() => move(index, index - 1)} disabled={index === 0 || locked(items[index - 1])} aria-label={`Mover item ${item.order} para cima`}>
                          <ArrowUp />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => move(index, index + 1)} disabled={index === items.length - 1 || locked(items[index + 1])} aria-label={`Mover item ${item.order} para baixo`}>
                          <ArrowDown />
                        </Button>
                      </>
                    ) : (
                      <span className="size-8" aria-hidden />
                    )}
                  </div>
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 font-bold text-primary tabular">{String(item.order).padStart(2, '0')}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          ITEM {String(item.order).padStart(2, '0')} — {p ? lk.title(p).toUpperCase() : 'Matéria removida'}
                        </p>
                        <p className="mt-1 text-sm text-foreground/85">{p?.summary}</p>
                      </div>
                      <StatusBadge meta={AgendaItemStatusMeta[item.status]} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
                      <div>
                        <dt className="text-muted-foreground">Tipo</dt>
                        <dd className="font-medium">{type?.name ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Autor</dt>
                        <dd className="font-medium">{p?.authorName ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Relator</dt>
                        <dd className="font-medium">{lk.councilorName(p?.rapporteurId)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Comissão</dt>
                        <dd className="font-medium">{committee || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Parecer</dt>
                        <dd className="flex flex-wrap gap-1">
                          {ops.length ? ops.map((o) => <StatusBadge key={o.id} meta={OpinionConclusionMeta[o.conclusion!]} />) : <span className="font-medium">{p?.committeeIds.length ? 'Pendente' : 'Dispensado'}</span>}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Regime</dt>
                        <dd className="font-medium">{p ? RegimeLabel[p.regime] : '—'}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <label className="grid gap-1 text-xs">
                        <span className="text-muted-foreground">Seção</span>
                        <NativeSelect value={item.section} disabled={itemLocked} onChange={(e) => patchItem(item.id, { section: e.target.value as AgendaSection })} className="h-8 text-xs">
                          {(Object.keys(SECTION_LABEL) as AgendaSection[]).map((s) => (
                            <option key={s} value={s}>
                              {SECTION_LABEL[s]}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span className="text-muted-foreground">Votação</span>
                        <NativeSelect value={item.votingMethod} disabled={itemLocked} onChange={(e) => patchItem(item.id, { votingMethod: e.target.value as VotingMethod })} className="h-8 text-xs">
                          {(Object.keys(VotingMethodLabel) as VotingMethod[]).map((m) => (
                            <option key={m} value={m}>
                              {VotingMethodLabel[m]}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span className="text-muted-foreground">Quórum</span>
                        <NativeSelect value={item.quorumRuleId} disabled={itemLocked} onChange={(e) => patchItem(item.id, { quorumRuleId: e.target.value })} className="h-8 text-xs">
                          {(settings?.quorumRules ?? []).map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                    </div>
                  </div>
                  {!itemLocked && (
                    <div className="no-print">
                      <Button variant="ghost" size="icon-sm" onClick={() => setToRemove(item)} aria-label={`Remover item ${item.order}`}>
                        <Trash2 className="text-danger" />
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      <AddItemsDialog open={adding} onOpenChange={setAdding} propositions={propositions.data ?? []} excludeIds={new Set(items.map((i) => i.propositionId))} lk={lk} onAdd={addPropositions} />

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remover item da pauta?"
        description={toRemove ? `O item ${toRemove.order} (${propMap.get(toRemove.propositionId) ? lk.code(propMap.get(toRemove.propositionId)!) : ''}) será retirado da pauta. Salve para confirmar a alteração.` : ''}
        confirmLabel="Remover item"
        onConfirm={() => {
          if (toRemove) update(items.filter((i) => i.id !== toRemove.id))
        }}
      />
      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        tone="default"
        title={agenda?.status === 'published' ? 'Republicar pauta?' : 'Publicar pauta?'}
        description={`A pauta com ${items.length} item(ns) será publicada no Portal da Transparência e os vereadores serão notificados.`}
        confirmLabel="Publicar"
        onConfirm={() => publish.run()}
      />
    </>
  )
}
