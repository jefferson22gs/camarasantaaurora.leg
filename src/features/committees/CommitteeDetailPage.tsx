import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarRange, FileCheck2, FileText, History, UserRound, Users } from 'lucide-react'
import { Avatar, Badge, Card, CardContent, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { PageHeader, StatCard } from '@/components/common/page'
import { LegislativeTimeline } from '@/components/common/LegislativeTimeline'
import { NotFoundPage } from '@/app/ErrorPages'
import { useCollection, useLookups } from '@/hooks/useData'
import { CommitteeKindLabel, OpinionConclusionMeta, OpinionStatusMeta, PropositionStatusMeta } from '@/domain/labels'
import { formatDate } from '@/lib/format'
import { COMMITTEE_STATUS_META } from './shared'

export default function CommitteeDetailPage() {
  const { id = '' } = useParams()
  const lk = useLookups()
  const committees = useCollection('committees')
  const propositions = useCollection('propositions')
  const opinions = useCollection('opinions')
  const movements = useCollection('movements')

  const committee = committees.data?.find((c) => c.id === id)
  const matters = useMemo(() => (propositions.data ?? []).filter((p) => p.committeeIds.includes(id)).sort((a, b) => b.presentedAt.localeCompare(a.presentedAt)), [propositions.data, id])
  const committeeOpinions = useMemo(() => (opinions.data ?? []).filter((o) => o.committeeId === id), [opinions.data, id])
  const propMap = useMemo(() => new Map((propositions.data ?? []).map((p) => [p.id, p])), [propositions.data])
  const history = useMemo(() => {
    const ids = new Set(matters.map((m) => m.id))
    return (movements.data ?? []).filter((m) => ids.has(m.propositionId) && (m.stage === 'committee' || m.stage === 'opinion' || m.stage === 'referral'))
  }, [movements.data, matters])

  if (committees.isLoading || !lk.ready) return <PageSkeleton />
  if (!committee) return <NotFoundPage />

  const pending = committeeOpinions.filter((o) => o.status !== 'completed').length
  const role = (cid: string) => (cid === committee.presidentId ? 'Presidente' : cid === committee.vicePresidentId ? 'Vice-Presidente' : 'Membro')
  const members = [...committee.memberIds].sort((a, b) => ['Presidente', 'Vice-Presidente', 'Membro'].indexOf(role(a)) - ['Presidente', 'Vice-Presidente', 'Membro'].indexOf(role(b)))

  return (
    <>
      <PageHeader
        title={committee.name}
        description={committee.description}
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Comissões', to: '/admin/comissoes' }, { label: committee.acronym }]}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge tone="primary">{committee.acronym}</Badge>
          <Badge>{CommitteeKindLabel[committee.kind]}</Badge>
          <StatusBadge meta={COMMITTEE_STATUS_META[committee.status]} />
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="size-4" aria-hidden /> {formatDate(committee.startDate)}
            {committee.endDate ? ` a ${formatDate(committee.endDate)}` : ''}
          </span>
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Membros" value={committee.memberIds.length} icon={Users} />
        <StatCard label="Matérias recebidas" value={matters.length} icon={FileText} tone="info" />
        <StatCard label="Pareceres emitidos" value={committeeOpinions.length - pending} icon={FileCheck2} tone="success" />
        <StatCard label="Pareceres pendentes" value={pending} icon={FileCheck2} tone="warning" />
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Membros</TabsTrigger>
          <TabsTrigger value="matters">Matérias recebidas</TabsTrigger>
          <TabsTrigger value="rapporteurs">Relatorias</TabsTrigger>
          <TabsTrigger value="opinions">Pareceres</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const c = lk.councilors.get(m)
              const party = lk.partyOf(m)
              return (
                <Card key={m} className="flex items-center gap-3 p-4">
                  <Avatar name={c?.parliamentaryName ?? '?'} src={c?.photoUrl} color={party?.color} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/vereadores/${m}`} className="block truncate font-medium hover:underline">
                      {c?.parliamentaryName ?? '—'}
                    </Link>
                    <p className="text-xs text-muted-foreground">{party?.acronym}</p>
                  </div>
                  <Badge tone={role(m) === 'Membro' ? 'neutral' : 'primary'}>{role(m)}</Badge>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="matters">
          <Card>
            {matters.length === 0 ? (
              <EmptyState icon={FileText} title="Nenhuma matéria recebida" />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Proposição</TH>
                    <TH>Ementa</TH>
                    <TH>Relator</TH>
                    <TH>Situação</TH>
                  </tr>
                </THead>
                <TBody>
                  {matters.map((p) => (
                    <TR key={p.id}>
                      <TD className="whitespace-nowrap font-medium">
                        <Link to={`/admin/proposicoes/${p.id}`} className="text-primary hover:underline">
                          {lk.code(p)}
                        </Link>
                      </TD>
                      <TD className="min-w-64 text-muted-foreground">
                        <span className="line-clamp-2">{p.summary}</span>
                      </TD>
                      <TD className="whitespace-nowrap">{lk.councilorName(committeeOpinions.find((o) => o.propositionId === p.id)?.rapporteurId ?? p.rapporteurId)}</TD>
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

        <TabsContent value="rapporteurs">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const assigned = committeeOpinions.filter((o) => o.rapporteurId === m)
              const done = assigned.filter((o) => o.status === 'completed').length
              return (
                <Card key={m} className="p-4">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" aria-hidden />
                    <p className="font-medium">{lk.councilorName(m)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {assigned.length} relatoria(s) · {done} concluída(s) · {assigned.length - done} pendente(s)
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {assigned.map((o) => {
                      const p = propMap.get(o.propositionId)
                      return p ? (
                        <li key={o.id}>
                          <Link to={`/admin/proposicoes/${p.id}`}>
                            <Badge tone={o.status === 'completed' ? 'success' : 'warning'}>{lk.code(p)}</Badge>
                          </Link>
                        </li>
                      ) : null
                    })}
                  </ul>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="opinions">
          <Card>
            {committeeOpinions.length === 0 ? (
              <EmptyState icon={FileCheck2} title="Nenhum parecer registrado" />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Matéria</TH>
                    <TH>Relator</TH>
                    <TH>Prazo</TH>
                    <TH>Emissão</TH>
                    <TH>Situação</TH>
                    <TH>Conclusão</TH>
                  </tr>
                </THead>
                <TBody>
                  {committeeOpinions.map((o) => {
                    const p = propMap.get(o.propositionId)
                    return (
                      <TR key={o.id}>
                        <TD className="whitespace-nowrap font-medium">{p ? lk.code(p) : '—'}</TD>
                        <TD className="whitespace-nowrap">{lk.councilorName(o.rapporteurId)}</TD>
                        <TD className="tabular">{formatDate(o.dueDate)}</TD>
                        <TD className="tabular">{formatDate(o.issuedAt)}</TD>
                        <TD>
                          <StatusBadge meta={OpinionStatusMeta[o.status]} />
                        </TD>
                        <TD>{o.conclusion ? <StatusBadge meta={OpinionConclusionMeta[o.conclusion]} /> : '—'}</TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent>
              {history.length === 0 ? <EmptyState icon={History} title="Sem movimentações" /> : <LegislativeTimeline movements={history} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
