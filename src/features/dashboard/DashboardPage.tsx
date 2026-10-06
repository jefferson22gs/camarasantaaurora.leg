import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Archive, CalendarCheck, CalendarClock, CheckCircle2, FileClock, FileText, History, Hourglass, Workflow, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/display'
import { Button } from '@/components/ui/button'
import { PageHeader, StatCard } from '@/components/common/page'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states'
import { useAuthStore } from '@/stores/authStore'
import { useOrganization } from '@/hooks/useData'
import { formatDateLong, formatDateTimeShort } from '@/lib/format'
import { axisProps, CHART_COLORS, ChartCard, tooltipStyle } from './charts'
import { FilterBar } from './FilterBar'
import { EMPTY_FILTERS, useDashboardData, type DashboardFilters } from './useDashboardData'

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS)
  const { data, isLoading, isError, refetch } = useDashboardData(filters)
  const user = useAuthStore((s) => s.user)
  const { data: org } = useOrganization()

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Dashboard' }]}
        title="Dashboard legislativo"
        description={`${org?.name ?? ''} · ${formatDateLong(new Date())}${user ? ` · Olá, ${user.name.split(' ')[0]}` : ''}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/relatorios">Relatórios</Link>
          </Button>
        }
      />

      <Card className="mb-6 p-4">
        <FilterBar value={filters} onChange={setFilters} />
      </Card>

      {isLoading ? (
        <PageSkeleton />
      ) : isError || !data ? (
        <Card>
          <ErrorState onRetry={refetch} />
        </Card>
      ) : (
        <div className="space-y-6">
          <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Total de proposições" value={data.stats.total} icon={FileText} tone="primary" />
            <StatCard label="Em tramitação" value={data.stats.inProgress} icon={Workflow} tone="info" />
            <StatCard label="Aprovadas" value={data.stats.approved} icon={CheckCircle2} tone="success" />
            <StatCard label="Rejeitadas" value={data.stats.rejected} icon={XCircle} tone="danger" />
            <StatCard label="Arquivadas / retiradas" value={data.stats.archived} icon={Archive} tone="neutral" />
            <StatCard label="Sessões realizadas" value={data.stats.sessionsDone} icon={CalendarCheck} tone="accent" />
            <StatCard label="Sessões futuras" value={data.stats.sessionsFuture} icon={CalendarClock} tone="info" />
            <StatCard label="Pareceres pendentes" value={data.stats.pendingOpinions} icon={FileClock} tone="warning" hint={<Link to="/admin/pareceres" className="text-primary hover:underline">Ver pareceres</Link>} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Proposições por mês" description="Data de apresentação" empty={!data.byMonth.length}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.byMonth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gMonth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="total" name="Proposições" stroke="var(--brand)" strokeWidth={2.5} fill="url(#gMonth)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Proposições por situação" empty={!data.byStatus.length}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.byStatus} dataKey="total" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="var(--card)">
                    {data.byStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--foreground)' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Proposições por tipo" empty={!data.byType.length}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byType} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...axisProps} />
                  <YAxis type="category" dataKey="code" width={44} {...axisProps} />
                  <Tooltip {...tooltipStyle} labelFormatter={(_, p) => (p?.[0]?.payload as { name?: string } | undefined)?.name ?? ''} />
                  <Bar dataKey="total" name="Proposições" fill="var(--brand)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Produção legislativa" description="Autoria e coautoria por vereador" empty={!data.production.length}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.production} margin={{ top: 8, right: 8, left: -18, bottom: 40 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={50} {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="total" name="Proposições" fill="var(--brand-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Presença por sessão" description={`Média do período: ${data.averagePresence}%`} empty={!data.presence.length}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.presence} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis domain={[0, 100]} unit="%" {...axisProps} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Presença']} />
                  <Line type="monotone" dataKey="presenca" name="Presença" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--success)' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Resultados das votações" description="Por sessão plenária" empty={!data.results.length}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.results} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="aprovadas" name="Aprovadas" stackId="r" fill="var(--success)" maxBarSize={36} />
                  <Bar dataKey="rejeitadas" name="Rejeitadas" stackId="r" fill="var(--danger)" maxBarSize={36} />
                  <Bar dataKey="outras" name="Empate/sem quórum" stackId="r" fill="var(--warning)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Atividades recentes</CardTitle>
                <CardDescription>Movimentações de tramitação e operações registradas</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/auditoria">
                  <History /> Auditoria
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data.activity.length === 0 ? (
                <EmptyState icon={Hourglass} title="Nenhuma atividade no período" />
              ) : (
                <ol className="relative space-y-4 border-l pl-5">
                  {data.activity.map((a) => (
                    <li key={`${a.kind}-${a.id}`} className="relative">
                      <span className={`absolute -left-[26px] top-1.5 size-2.5 rounded-full ring-4 ring-card ${a.kind === 'movement' ? 'bg-primary' : 'bg-brand-2'}`} aria-hidden />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-sm font-medium">{a.link ? <Link to={a.link} className="hover:underline">{a.title}</Link> : a.title}</p>
                        <time className="text-xs text-muted-foreground tabular" dateTime={a.at}>
                          {formatDateTimeShort(a.at)}
                        </time>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{a.subtitle}</p>
                      <p className="text-xs text-muted-foreground">{a.who}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
