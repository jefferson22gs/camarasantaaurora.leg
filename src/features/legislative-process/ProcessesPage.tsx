import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Info, Send, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Card, StatusBadge } from '@/components/ui/display'
import { Dialog, SheetContent } from '@/components/ui/overlay'
import { NativeSelect } from '@/components/ui/form-controls'
import { PageHeader, Pagination, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection, useLookups, usePermission, useSettings } from '@/hooks/useData'
import { buildLegislativeProcess } from '@/domain/legislative/process'
import { PropositionStatusMeta } from '@/domain/labels'
import { formatDate, formatDateTimeShort } from '@/lib/format'
import { cn, matches } from '@/lib/utils'
import type { LegislativeProcess, ProcessMovement, ProcessStage, Proposition } from '@/types'
import { MoveDialog } from '@/features/propositions/MoveDialog'
import { CompactStepper, VerticalStepper } from './ProcessStepper'

type Scope = 'active' | 'finished' | 'all'
const FINISHED = new Set(['archived', 'withdrawn', 'sanctioned', 'promulgated'])

interface Row {
  proposition: Proposition
  process: LegislativeProcess
  lastAt?: string
}

export default function ProcessesPage() {
  const can = usePermission()
  const lk = useLookups()
  const settingsQ = useSettings()
  const propositionsQ = useCollection('propositions')
  const movementsQ = useCollection('movements')
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<ProcessStage | ''>('')
  const [scope, setScope] = useState<Scope>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const canMove = can('processes', 'operate') || can('processes', 'edit')

  const flow = useMemo(() => (settingsQ.data?.processFlow ?? []).filter((s) => s.enabled), [settingsQ.data])

  const rows = useMemo<Row[]>(() => {
    if (!settingsQ.data) return []
    const byProp = new Map<string, ProcessMovement[]>()
    for (const m of movementsQ.data ?? []) byProp.set(m.propositionId, [...(byProp.get(m.propositionId) ?? []), m])
    return (propositionsQ.data ?? [])
      .filter((p) => p.status !== 'draft')
      .map((p) => {
        const movements = byProp.get(p.id) ?? []
        return {
          proposition: p,
          process: buildLegislativeProcess(p, settingsQ.data.processFlow, movements, settingsQ.data.propositionTypes.find((t) => t.id === p.typeId)),
          lastAt: movements.reduce<string | undefined>((max, m) => (!max || m.at > max ? m.at : max), undefined),
        }
      })
      .sort((a, b) => (b.lastAt ?? b.proposition.presentedAt).localeCompare(a.lastAt ?? a.proposition.presentedAt))
  }, [propositionsQ.data, movementsQ.data, settingsQ.data])

  const inScope = useMemo(() => rows.filter((r) => scope === 'all' || (scope === 'finished') === FINISHED.has(r.proposition.status)), [rows, scope])
  const countByStage = useMemo(() => {
    const map = new Map<ProcessStage, number>()
    for (const r of inScope) map.set(r.proposition.stage, (map.get(r.proposition.stage) ?? 0) + 1)
    return map
  }, [inScope])

  const filtered = useMemo(
    () => inScope.filter((r) => (!stage || r.proposition.stage === stage) && matches([lk.code(r.proposition), r.proposition.summary, r.proposition.authorName, r.proposition.protocolNumber], search)),
    [inScope, stage, search, lk],
  )
  const pagination = usePagination(filtered, 10)
  const selected = rows.find((r) => r.proposition.id === selectedId)

  return (
    <>
      <PageHeader
        title="Processos legislativos"
        description="Acompanhe a tramitação das matérias por etapa: etapa atual, concluídas, responsáveis, datas e documentos."
        breadcrumb={[{ label: 'Administração', to: '/admin/dashboard' }, { label: 'Processos' }]}
      />

      <Alert tone="info" className="mb-5">
        O fluxo de tramitação é configurável por Câmara em <Link to="/admin/configuracoes" className="font-medium text-primary hover:underline">Configurações › Tramitação</Link>.
      </Alert>

      {/* Contadores por etapa */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-label="Filtrar por etapa">
        <StageChip label="Todas" count={inScope.length} active={!stage} onClick={() => setStage('')} />
        {flow.map((s) => (
          <StageChip key={s.key} label={s.label} count={countByStage.get(s.key) ?? 0} active={stage === s.key} onClick={() => setStage(stage === s.key ? '' : s.key)} />
        ))}
      </div>

      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar matéria, autor, protocolo…" className="w-full sm:w-auto" />
          <NativeSelect aria-label="Situação dos processos" value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="w-full sm:w-auto">
            <option value="active">Em tramitação</option>
            <option value="finished">Concluídos/arquivados</option>
            <option value="all">Todos</option>
          </NativeSelect>
        </Toolbar>
        <QueryState
          query={propositionsQ}
          isEmpty={() => filtered.length === 0}
          empty={<EmptyState icon={Workflow} title="Nenhum processo encontrado" description="Altere a etapa ou a busca para ver outros processos." />}
        >
          {() => (
            <>
              <ul className="divide-y">
                {pagination.slice.map(({ proposition: p, process, lastAt }) => {
                  const current = process.steps.find((s) => s.state === 'current')
                  return (
                    <li key={p.id}>
                      <button className="grid w-full gap-3 p-4 text-left transition-colors hover:bg-muted/40 md:grid-cols-[14rem_1fr_16rem] md:items-center" onClick={() => setSelectedId(p.id)}>
                        <div className="min-w-0">
                          <p className="font-semibold text-primary">{lk.code(p)}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.authorName}</p>
                        </div>
                        <p className="line-clamp-2 text-sm">{p.summary}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium">{current?.label ?? 'Concluído'}</span>
                            <StatusBadge meta={PropositionStatusMeta[p.status]} />
                          </div>
                          <CompactStepper process={process} />
                          <p className="text-[11px] text-muted-foreground">Última movimentação: {lastAt ? formatDateTimeShort(lastAt) : formatDate(p.presentedAt)}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <Pagination {...pagination} />
            </>
          )}
        </QueryState>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected && (
          <SheetContent
            title={lk.title(selected.proposition)}
            description={selected.proposition.summary}
            footer={
              <>
                <Button variant="outline" asChild>
                  <Link to={`/admin/proposicoes/${selected.proposition.id}`}>
                    <ExternalLink /> Abrir proposição
                  </Link>
                </Button>
                {canMove && (
                  <Button onClick={() => setMoveOpen(true)}>
                    <Send /> Tramitar
                  </Button>
                )}
              </>
            }
          >
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm">
              <Info className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                Progresso: <strong>{Math.round(selected.process.progress * 100)}%</strong> · {selected.process.steps.filter((s) => s.state === 'done').length} de {selected.process.steps.length} etapas concluídas
              </span>
            </div>
            <VerticalStepper process={selected.process} />
          </SheetContent>
        )}
      </Dialog>

      {selected && canMove && <MoveDialog proposition={selected.proposition} open={moveOpen} onOpenChange={setMoveOpen} />}
    </>
  )
}

function StageChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn('flex shrink-0 flex-col items-start rounded-lg border bg-card px-3.5 py-2 text-left transition-colors hover:border-primary/50', active && 'border-primary bg-primary/5 ring-1 ring-primary')}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-xl font-bold tabular">{count}</span>
    </button>
  )
}
