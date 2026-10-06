import { useMemo, useState } from 'react'
import { ArrowLeft, Download, FileBarChart, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { PageHeader, Pagination, usePagination } from '@/components/common/page'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states'
import { Crest } from '@/components/common/Brand'
import { useCollection, useLookups, useOrganization, usePermission } from '@/hooks/useData'
import { downloadFile, toCsv } from '@/lib/csv'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FilterBar } from '@/features/dashboard/FilterBar'
import { EMPTY_FILTERS, type DashboardFilters } from '@/features/dashboard/useDashboardData'
import { REPORTS, type ReportData, type ReportDefinition } from './reportDefinitions'

function useReportData(): { data: ReportData | null; isLoading: boolean; isError: boolean; refetch: () => void } {
  const queries = {
    propositions: useCollection('propositions'),
    sessions: useCollection('sessions'),
    attendance: useCollection('attendance'),
    votings: useCollection('votings'),
    votes: useCollection('votes'),
    movements: useCollection('movements'),
    opinions: useCollection('opinions'),
    agendas: useCollection('agendas'),
    legislatures: useCollection('legislatures'),
  }
  const lk = useLookups()
  const list = Object.values(queries)
  const isLoading = list.some((q) => q.isLoading) || !lk.ready
  const isError = list.some((q) => q.isError)
  const q = queries
  const data = useMemo<ReportData | null>(() => {
    if (!q.propositions.data || !q.sessions.data || !q.attendance.data || !q.votings.data || !q.votes.data || !q.movements.data || !q.opinions.data || !q.agendas.data || !q.legislatures.data || !lk.ready) return null
    return {
      propositions: q.propositions.data,
      sessions: q.sessions.data,
      attendance: q.attendance.data,
      votings: q.votings.data,
      votes: q.votes.data,
      movements: q.movements.data,
      opinions: q.opinions.data,
      agendas: q.agendas.data,
      legislatures: q.legislatures.data,
      lk,
    }
  }, [q.propositions.data, q.sessions.data, q.attendance.data, q.votings.data, q.votes.data, q.movements.data, q.opinions.data, q.agendas.data, q.legislatures.data, lk])
  return { data, isLoading, isError, refetch: () => list.forEach((x) => x.refetch()) }
}

export default function ReportsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const report = REPORTS.find((r) => r.id === selectedId)

  return report ? (
    <ReportView report={report} onBack={() => setSelectedId(null)} />
  ) : (
    <>
      <PageHeader breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Relatórios' }]} title="Central de relatórios" description="Relatórios gerenciais e legislativos com filtros, impressão e exportação CSV." />
      {(['Proposições', 'Plenário', 'Votações'] as const).map((group) => (
        <section key={group} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {REPORTS.filter((r) => r.group === group).map((r) => (
              <button key={r.id} onClick={() => setSelectedId(r.id)} className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold group-hover:text-primary">{r.title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{r.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function ReportView({ report, onBack }: { report: ReportDefinition; onBack: () => void }) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const { data, isLoading, isError, refetch } = useReportData()
  const { data: org } = useOrganization()
  const can = usePermission()
  const rows = useMemo(() => (data ? report.build(data, filters) : []), [data, report, filters])
  const pagination = usePagination(rows, 25)
  const [printAll, setPrintAll] = useState(false)

  function exportCsv() {
    downloadFile(`relatorio-${report.id}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(report.columns, rows))
    toast.success('Relatório exportado em CSV.')
  }

  function print() {
    setPrintAll(true)
    setTimeout(() => {
      window.print()
      setPrintAll(false)
    }, 50)
  }

  const visible = printAll ? rows : pagination.slice
  const activeFilters = report.filters.filter((k) => filters[k]).length

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Relatórios', to: '/admin/relatorios' }, { label: report.title }]}
        title={report.title}
        description={report.description}
        actions={
          <>
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft /> Catálogo
            </Button>
            <Button variant="outline" onClick={print} disabled={!rows.length}>
              <Printer /> Imprimir
            </Button>
            {can('reports', 'export') && (
              <Button onClick={exportCsv} disabled={!rows.length}>
                <Download /> Exportar CSV
              </Button>
            )}
          </>
        }
      />

      <Card className="no-print mb-6 p-4">
        <FilterBar value={filters} onChange={setFilters} fields={report.filters} className={cn(report.filters.length < 5 && 'xl:grid-cols-5')} />
      </Card>

      <div className="print-only mb-6 border-b pb-4">
        <div className="flex items-center gap-3">
          <Crest org={org} className="size-12" />
          <div>
            <p className="text-lg font-bold">{org?.name}</p>
            <p className="text-sm">{report.title}</p>
            <p className="text-xs">
              Emitido em {formatDateTime(new Date())}
              {filters.from || filters.to ? ` · Período: ${formatDate(filters.from) === '—' ? 'início' : formatDate(filters.from)} a ${formatDate(filters.to) === '—' ? 'hoje' : formatDate(filters.to)}` : ''}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : isError || !data ? (
        <Card>
          <ErrorState onRetry={refetch} />
        </Card>
      ) : (
        <Card className="print-plain">
          <div className="no-print flex items-center justify-between border-b px-4 py-3 text-sm text-muted-foreground">
            <span>
              {rows.length} registro(s){activeFilters ? ` · ${activeFilters} filtro(s) ativo(s)` : ''}
            </span>
          </div>
          {rows.length === 0 ? (
            <CardContent>
              <EmptyState icon={FileBarChart} title="Nenhum registro para os filtros selecionados" description="Ajuste o período ou os filtros para visualizar o relatório." />
            </CardContent>
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    {report.columns.map((c) => (
                      <TH key={c.header}>{c.header}</TH>
                    ))}
                  </TR>
                </THead>
                <TBody>
                  {visible.map((r, i) => (
                    <TR key={i}>
                      {report.columns.map((c, j) => {
                        const v = c.value(r)
                        return (
                          <TD key={c.header} className={cn(typeof v === 'number' && 'text-right tabular', j === 0 && 'font-medium', String(v).length > 60 && 'min-w-72')}>
                            {v ?? '—'}
                          </TD>
                        )
                      })}
                    </TR>
                  ))}
                </TBody>
              </Table>
              {!printAll && <Pagination {...pagination} />}
            </>
          )}
        </Card>
      )}
    </>
  )
}
