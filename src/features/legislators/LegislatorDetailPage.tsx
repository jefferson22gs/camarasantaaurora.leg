import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { CalendarCheck, FileText, Landmark, Users, Vote } from 'lucide-react'
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, DescriptionList, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { PageHeader, StatCard } from '@/components/common/page'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { NotFoundPage } from '@/app/ErrorPages'
import { useAreaBase, useCollection, useLookups } from '@/hooks/useData'
import { AttendanceStatusMeta, BoardRoleLabel, CommitteeKindLabel, CouncilorStatusMeta, PropositionStatusMeta, VoteChoiceMeta } from '@/domain/labels'
import { formatCPF, formatDate, formatDateTime, formatPercent } from '@/lib/format'
import { councilorStats } from './councilorStats'
import { propositionPath, sessionLabel } from './shared'

export default function LegislatorDetailPage() {
  const { id = '' } = useParams()
  const base = useAreaBase()
  const lk = useLookups()
  const councilors = useCollection('councilors')
  const propositions = useCollection('propositions')
  const attendance = useCollection('attendance')
  const votes = useCollection('votes')
  const votings = useCollection('votings')
  const sessions = useCollection('sessions')
  const committees = useCollection('committees')
  const legislatures = useCollection('legislatures')

  const councilor = councilors.data?.find((c) => c.id === id)
  const stats = useMemo(
    () => (councilor ? councilorStats(councilor, { propositions: propositions.data, attendance: attendance.data, votes: votes.data, votings: votings.data, committees: committees.data }) : null),
    [councilor, propositions.data, attendance.data, votes.data, votings.data, committees.data],
  )
  const sessionMap = useMemo(() => new Map((sessions.data ?? []).map((s) => [s.id, s])), [sessions.data])
  const propMap = useMemo(() => new Map((propositions.data ?? []).map((p) => [p.id, p])), [propositions.data])
  const production = useMemo(() => {
    const map = new Map<string, number>()
    stats?.authored.forEach((p) => {
      const code = lk.types.get(p.typeId)?.code ?? 'OUT'
      map.set(code, (map.get(code) ?? 0) + 1)
    })
    return [...map.entries()].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total)
  }, [stats, lk.types])

  if (councilors.isLoading || !lk.ready) return <PageSkeleton />
  if (!councilor || !stats) return <NotFoundPage />

  const party = lk.parties.get(councilor.partyId)
  const legislature = legislatures.data?.find((l) => l.id === councilor.legislatureId)
  const listPath = base === '/admin' ? '/admin/vereadores' : undefined

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <Avatar name={councilor.parliamentaryName} src={councilor.photoUrl} color={party?.color} className="size-14 text-lg" />
            <span className="min-w-0">
              <span className="block">{councilor.parliamentaryName}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-muted-foreground">
                {party?.acronym} · {councilor.mandate === 'holder' ? 'Titular' : 'Suplente'}
                {councilor.boardRole && <Badge tone="primary">{BoardRoleLabel[councilor.boardRole]}</Badge>}
                <StatusBadge meta={CouncilorStatusMeta[councilor.status]} />
              </span>
            </span>
          </span>
        }
        breadcrumb={[{ label: 'Início', to: `${base}/dashboard` }, { label: 'Vereadores', to: listPath }, { label: councilor.parliamentaryName }]}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Proposições" value={stats.authored.length} icon={FileText} />
        <StatCard label="Presença" value={formatPercent(stats.attendanceRate)} icon={CalendarCheck} tone="success" hint={`${stats.present} de ${stats.attendance.length} sessões`} />
        <StatCard label="Votos nominais" value={stats.votes.length} icon={Vote} tone="info" />
        <StatCard label="Comissões" value={stats.committees.length} icon={Users} tone="accent" />
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="props">Proposições</TabsTrigger>
          <TabsTrigger value="attendance">Presenças</TabsTrigger>
          <TabsTrigger value="votes">Votações</TabsTrigger>
          <TabsTrigger value="committees">Comissões</TabsTrigger>
          <TabsTrigger value="production">Produção legislativa</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent>
              <DescriptionList
                items={[
                  { label: 'Nome completo', value: councilor.fullName },
                  { label: 'Nome parlamentar', value: councilor.parliamentaryName },
                  { label: 'Partido', value: party ? `${party.acronym} — ${party.name}` : '—' },
                  { label: 'Legislatura', value: legislature?.name },
                  { label: 'Mandato', value: `${councilor.mandate === 'holder' ? 'Titular' : 'Suplente'} · ${formatDate(councilor.mandateStart)} a ${formatDate(councilor.mandateEnd)}` },
                  { label: 'Cargo na Mesa', value: councilor.boardRole ? BoardRoleLabel[councilor.boardRole] : 'Nenhum' },
                  { label: 'E-mail', value: <a href={`mailto:${councilor.email}`} className="text-primary hover:underline">{councilor.email}</a> },
                  { label: 'Telefone', value: councilor.phone },
                  ...(base === '/admin' ? [{ label: 'CPF', value: councilor.cpf ? formatCPF(councilor.cpf) : 'Não informado' }] : []),
                  { label: 'Biografia', value: councilor.bio || '—', full: true },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="props">
          <Card>
            {stats.authored.length === 0 ? (
              <EmptyState icon={FileText} title="Nenhuma proposição de autoria" />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Proposição</TH>
                    <TH>Ementa</TH>
                    <TH>Participação</TH>
                    <TH>Situação</TH>
                  </tr>
                </THead>
                <TBody>
                  {stats.authored.map((p) => (
                    <TR key={p.id}>
                      <TD className="whitespace-nowrap font-medium">
                        <Link to={propositionPath(base, p.id)} className="text-primary hover:underline">
                          {lk.code(p)}
                        </Link>
                      </TD>
                      <TD className="min-w-64 text-muted-foreground">
                        <span className="line-clamp-2">{p.summary}</span>
                      </TD>
                      <TD>{p.authorId === councilor.id ? 'Autor' : 'Coautor'}</TD>
                      <TD>
                        <StatusBadge meta={PropositionStatusMeta[p.status]} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            {stats.attendance.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="Sem registros de presença" />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Sessão</TH>
                    <TH>Data</TH>
                    <TH>Situação</TH>
                    <TH>Justificativa</TH>
                  </tr>
                </THead>
                <TBody>
                  {[...stats.attendance]
                    .sort((a, b) => (sessionMap.get(b.sessionId)?.date ?? '').localeCompare(sessionMap.get(a.sessionId)?.date ?? ''))
                    .map((a) => {
                      const s = sessionMap.get(a.sessionId)
                      return (
                        <TR key={a.id}>
                          <TD className="font-medium">{sessionLabel(s)}</TD>
                          <TD className="tabular">{formatDate(s?.date)}</TD>
                          <TD>
                            <StatusBadge meta={AttendanceStatusMeta[a.status]} />
                          </TD>
                          <TD className="text-muted-foreground">{a.justification ?? '—'}</TD>
                        </TR>
                      )
                    })}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="votes">
          <Card>
            {stats.votes.length === 0 ? (
              <EmptyState icon={Vote} title="Nenhum voto nominal registrado" description="Votos em votações secretas não são associados ao vereador." />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Data/hora</TH>
                    <TH>Matéria</TH>
                    <TH>Sessão</TH>
                    <TH>Voto</TH>
                    <TH>Resultado</TH>
                  </tr>
                </THead>
                <TBody>
                  {[...stats.votes]
                    .sort((a, b) => b.vote.castAt.localeCompare(a.vote.castAt))
                    .map(({ vote, voting }) => {
                      const p = propMap.get(vote.propositionId)
                      return (
                        <TR key={vote.id}>
                          <TD className="whitespace-nowrap tabular text-xs">{formatDateTime(vote.castAt)}</TD>
                          <TD className="whitespace-nowrap font-medium">
                            {p ? (
                              <Link to={propositionPath(base, p.id)} className="text-primary hover:underline">
                                {lk.code(p)}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TD>
                          <TD className="whitespace-nowrap">{sessionLabel(sessionMap.get(vote.sessionId))}</TD>
                          <TD>
                            <StatusBadge meta={VoteChoiceMeta[vote.choice]} />
                          </TD>
                          <TD>{voting?.result ? <OutcomeSeal outcome={voting.result.outcome} size="sm" /> : '—'}</TD>
                        </TR>
                      )
                    })}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="committees">
          {stats.committees.length === 0 ? (
            <Card>
              <EmptyState icon={Users} title="Não integra comissões" />
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {stats.committees.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{c.acronym}</Badge>
                    <Badge>{CommitteeKindLabel[c.kind]}</Badge>
                  </div>
                  {base === '/admin' ? (
                    <Link to={`/admin/comissoes/${c.id}`} className="mt-2 block font-medium hover:underline">
                      {c.name}
                    </Link>
                  ) : (
                    <p className="mt-2 font-medium">{c.name}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">{c.presidentId === councilor.id ? 'Presidente' : c.vicePresidentId === councilor.id ? 'Vice-Presidente' : 'Membro'}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="production">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Produção legislativa por tipo</CardTitle>
              </div>
              <Landmark className="size-5 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              {production.length === 0 ? (
                <EmptyState icon={FileText} title="Sem produção registrada" />
              ) : (
                <div className="h-64" role="img" aria-label={production.map((p) => `${p.tipo}: ${p.total}`).join(', ')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={production} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="tipo" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <ChartTooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }} formatter={(v) => [v, 'Proposições']} />
                      <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
