import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarCheck, FileText, Mail, Phone, Vote } from 'lucide-react'
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, StatusBadge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { StatCard } from '@/components/common/page'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { useCollection, useLookups, useSettings } from '@/hooks/useData'
import { BoardRoleLabel, CouncilorStatusMeta, PropositionStatusMeta } from '@/domain/labels'
import { formatDate, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { attendanceRate, PUBLIC_BASE, PublicContainer, PublicNotFound, PublicPageHeader, sessionTitle, useIndex, usePublicPropositions, usePublicVotings, useVoteLabels } from './shared'

export default function PublicCouncilorDetailPage() {
  const { id } = useParams()
  const councilors = useCollection('councilors')
  const attendance = useCollection('attendance')
  const sessions = useCollection('sessions')
  const votes = useCollection('votes')
  const props = usePublicPropositions()
  const votings = usePublicVotings()
  const { data: settings } = useSettings()
  const labels = useVoteLabels()
  const lk = useLookups()
  const propIndex = useIndex(props.data)
  const sessionIndex = useIndex(sessions.data)
  const votingIndex = useIndex(votings.data)

  const c = councilors.data?.find((x) => x.id === id)
  const authored = useMemo(() => (props.data ?? []).filter((p) => p.authorId === id || p.coauthorIds.includes(id ?? '')), [props.data, id])
  const myAttendance = useMemo(() => (attendance.data ?? []).filter((a) => a.councilorId === id), [attendance.data, id])
  const publishNominal = settings?.transparency.publishNominalVotes ?? false
  const myVotes = useMemo(
    () =>
      publishNominal
        ? (votes.data ?? [])
            .filter((v) => v.councilorId === id && votingIndex.get(v.votingId)?.method === 'nominal')
            .sort((a, b) => b.castAt.localeCompare(a.castAt))
        : [],
    [votes.data, id, votingIndex, publishNominal],
  )

  if (councilors.isLoading || !lk.ready) return <PublicContainer><PageSkeleton /></PublicContainer>
  if (!c) return <PublicNotFound title="Vereador não encontrado" backTo={`${PUBLIC_BASE}/vereadores`} backLabel="Voltar aos vereadores" />

  const party = lk.parties.get(c.partyId)
  const rate = attendanceRate(myAttendance)
  const showAttendance = settings?.transparency.publishAttendance ?? true

  return (
    <PublicContainer>
      <PublicPageHeader title={c.parliamentaryName} crumbs={[{ label: 'Vereadores', to: `${PUBLIC_BASE}/vereadores` }, { label: c.parliamentaryName }]} />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={c.parliamentaryName} src={c.photoUrl} color={party?.color} className="size-24 text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{c.fullName}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {party && (
                <Badge className="border-transparent text-white" style={{ background: party.color }}>
                  {party.acronym} · {party.name}
                </Badge>
              )}
              {c.boardRole && <Badge tone="primary">{BoardRoleLabel[c.boardRole]}</Badge>}
              <StatusBadge meta={CouncilorStatusMeta[c.status]} />
              <Badge>{c.mandate === 'holder' ? 'Titular' : 'Suplente'}</Badge>
            </div>
            {c.bio && <p className="mt-3 max-w-2xl text-sm text-foreground/80">{c.bio}</p>}
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-4" aria-hidden />
                <a href={`mailto:${c.email}`} className="break-all hover:text-primary hover:underline">
                  {c.email}
                </a>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-4" aria-hidden /> {c.phone}
              </span>
              <span>
                Mandato: {formatDate(c.mandateStart)} a {formatDate(c.mandateEnd)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Proposições (autoria/coautoria)" value={authored.length} icon={FileText} />
        <StatCard label="Presença em sessões" value={showAttendance && rate !== null ? formatPercent(rate) : '—'} icon={CalendarCheck} tone="success" hint={showAttendance ? `${myAttendance.filter((a) => a.status === 'present').length} de ${myAttendance.filter((a) => a.status !== 'pending').length} sessões` : undefined} />
        <StatCard label="Votos nominais registrados" value={publishNominal ? myVotes.length : '—'} icon={Vote} tone="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proposições</CardTitle>
          </CardHeader>
          {authored.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhuma proposição de autoria" />
          ) : (
            <ul className="divide-y">
              {authored.map((p) => (
                <li key={p.id}>
                  <Link to={`${PUBLIC_BASE}/proposicoes/${p.id}`} className="block px-5 py-3.5 hover:bg-muted/40">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-primary">{lk.code(p)}</span>
                      <StatusBadge meta={PropositionStatusMeta[p.status]} />
                      {p.authorId !== c.id && <Badge>Coautoria</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{p.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Votos nominais</CardTitle>
          </CardHeader>
          {!publishNominal ? (
            <EmptyState icon={Vote} title="Votos nominais não publicados" description="A Câmara divulga apenas o placar das votações." />
          ) : myVotes.length === 0 ? (
            <EmptyState icon={Vote} title="Nenhum voto nominal registrado" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Matéria</TH>
                  <TH>Voto</TH>
                  <TH>Resultado</TH>
                </TR>
              </THead>
              <TBody>
                {myVotes.map((v) => {
                  const p = propIndex.get(v.propositionId)
                  const voting = votingIndex.get(v.votingId)
                  const s = sessionIndex.get(v.sessionId)
                  return (
                    <TR key={v.id}>
                      <TD>
                        <Link to={`${PUBLIC_BASE}/votacoes/${v.votingId}`} className="font-medium text-primary hover:underline">
                          {p ? lk.code(p) : 'Matéria'}
                        </Link>
                        <p className="text-xs text-muted-foreground">{s ? sessionTitle(s) : formatDate(v.castAt)}</p>
                      </TD>
                      <TD>
                        <span className={cn('text-xs font-bold', v.choice === 'yes' ? 'text-success' : v.choice === 'no' ? 'text-danger' : 'text-warning')}>{labels[v.choice]}</span>
                      </TD>
                      <TD>{voting && <OutcomeSeal outcome={voting.result.outcome} size="sm" />}</TD>
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
