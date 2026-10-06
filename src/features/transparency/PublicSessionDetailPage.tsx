import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClipboardList, ScrollText, UserCheck, Vote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, Card, CardContent, CardHeader, CardTitle, DescriptionList, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { useCollection, useLookups, useSettings } from '@/hooks/useData'
import { AgendaItemStatusMeta, AttendanceStatusMeta, SessionStatusMeta, VotingMethodLabel } from '@/domain/labels'
import { formatDateLong } from '@/lib/format'
import { PUBLIC_BASE, PublicContainer, PublicNotFound, PublicPageHeader, ScoreLine, sessionTitle, useIndex, usePublicVotings } from './shared'

export default function PublicSessionDetailPage() {
  const { id } = useParams()
  const sessions = useCollection('sessions')
  const agendas = useCollection('agendas')
  const attendance = useCollection('attendance')
  const propositions = useCollection('propositions')
  const votings = usePublicVotings()
  const { data: settings } = useSettings()
  const lk = useLookups()
  const propIndex = useIndex(propositions.data)

  const s = sessions.data?.find((x) => x.id === id)
  const agenda = (agendas.data ?? []).find((a) => a.sessionId === id && a.status === 'published')
  const rows = useMemo(
    () => (attendance.data ?? []).filter((a) => a.sessionId === id).sort((a, b) => lk.councilorName(a.councilorId).localeCompare(lk.councilorName(b.councilorId), 'pt-BR')),
    [attendance.data, id, lk],
  )
  const myVotings = (votings.data ?? []).filter((v) => v.sessionId === id)

  if (sessions.isLoading || !lk.ready) return <PublicContainer><PageSkeleton /></PublicContainer>
  if (!s) return <PublicNotFound title="Sessão não encontrada" backTo={`${PUBLIC_BASE}/sessoes`} backLabel="Voltar às sessões" />

  const publishAttendance = settings?.transparency.publishAttendance ?? true
  const present = rows.filter((r) => r.status === 'present').length

  return (
    <PublicContainer>
      <PublicPageHeader
        title={sessionTitle(s)}
        crumbs={[{ label: 'Sessões', to: `${PUBLIC_BASE}/sessoes` }, { label: `${s.number}/${s.year}` }]}
        description={<StatusBadge meta={SessionStatusMeta[s.status]} />}
        actions={
          s.status === 'closed' && settings?.transparency.publishMinutes ? (
            <Button asChild variant="outline">
              <Link to={`${PUBLIC_BASE}/atas?sessao=${s.id}`}>
                <ScrollText /> Visualizar ata
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionList
                items={[
                  { label: 'Data', value: <span className="capitalize">{formatDateLong(s.date)}</span> },
                  { label: 'Horário', value: `${s.startTime}${s.endTime ? ` às ${s.endTime}` : ''}` },
                  { label: 'Local', value: s.location },
                  { label: 'Presidente', value: lk.councilorName(s.presidentId) },
                  { label: 'Expediente', value: s.expedient || '—', full: true },
                  ...(s.notes ? [{ label: 'Observações', value: s.notes, full: true }] : []),
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-4" aria-hidden /> Pauta / Ordem do Dia
              </CardTitle>
            </CardHeader>
            {!agenda ? (
              <EmptyState icon={ClipboardList} title="Pauta não publicada" />
            ) : (
              <ol className="divide-y">
                {[...agenda.items]
                  .sort((a, b) => a.order - b.order)
                  .map((i) => {
                    const p = propIndex.get(i.propositionId)
                    return (
                      <li key={i.id} className="flex gap-4 px-5 py-4">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i.order}</span>
                        <div className="min-w-0 flex-1">
                          {p ? (
                            <Link to={`${PUBLIC_BASE}/proposicoes/${p.id}`} className="font-medium text-primary hover:underline">
                              {lk.title(p)}
                            </Link>
                          ) : (
                            <span className="font-medium">Matéria</span>
                          )}
                          {p && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{p.summary}</p>}
                          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <StatusBadge meta={AgendaItemStatusMeta[i.status]} />
                            Votação {VotingMethodLabel[i.votingMethod].toLowerCase()} · {lk.quorums.get(i.quorumRuleId)?.name}
                          </p>
                        </div>
                      </li>
                    )
                  })}
              </ol>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="size-4" aria-hidden /> Votações
              </CardTitle>
            </CardHeader>
            {myVotings.length === 0 ? (
              <EmptyState icon={Vote} title="Nenhuma votação encerrada nesta sessão" />
            ) : (
              <ul className="divide-y">
                {myVotings.map((v) => {
                  const p = propIndex.get(v.propositionId)
                  return (
                    <li key={v.id}>
                      <Link to={`${PUBLIC_BASE}/votacoes/${v.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-muted/40 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{p ? lk.title(p) : 'Matéria'}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            <ScoreLine r={v.result} />
                          </p>
                        </div>
                        <OutcomeSeal outcome={v.result.outcome} size="sm" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="size-4" aria-hidden /> Presenças
              </CardTitle>
              {publishAttendance && rows.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {present} de {rows.length} vereadores presentes
                </p>
              )}
            </div>
          </CardHeader>
          {!publishAttendance ? (
            <EmptyState title="Presenças não publicadas" description="A divulgação de presenças está desabilitada pela Câmara." />
          ) : rows.length === 0 ? (
            <EmptyState icon={UserCheck} title="Presença ainda não registrada" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Vereador</TH>
                  <TH>Situação</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const party = lk.partyOf(r.councilorId)
                  return (
                    <TR key={r.id}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={lk.councilorName(r.councilorId)} src={lk.councilors.get(r.councilorId)?.photoUrl} color={party?.color} className="size-7" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{lk.councilorName(r.councilorId)}</span>
                            <span className="text-xs text-muted-foreground">{party?.acronym}</span>
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <StatusBadge meta={AttendanceStatusMeta[r.status]} />
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </PublicContainer>
  )
}
