import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Pagination, PageHeader, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { OutcomeSeal } from '@/components/common/VotingSummary'
import { AttendanceStatusMeta, SessionTypeLabel, VoteChoiceMeta } from '@/domain/labels'
import { useCollection, useLookups } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { downloadFile, toCsv } from '@/lib/csv'
import { formatDate, formatDateTime } from '@/lib/format'
import { matches } from '@/lib/utils'

/** Histórico pessoal do vereador: votos nominais (com identificador) e presenças. */
export default function CouncilorHistoryPage() {
  const id = useAuthStore((s) => s.user?.councilorId) ?? ''
  const lk = useLookups()
  const votes = useCollection('votes')
  const votings = useCollection('votings')
  const sessions = useCollection('sessions')
  const props = useCollection('propositions')
  const attendance = useCollection('attendance')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    return (votes.data ?? [])
      .filter((v) => v.councilorId === id)
      .map((v) => ({
        vote: v,
        voting: votings.data?.find((x) => x.id === v.votingId),
        session: sessions.data?.find((s) => s.id === v.sessionId),
        prop: props.data?.find((p) => p.id === v.propositionId),
      }))
      .filter((r) => matches([r.vote.code, r.prop && lk.code(r.prop), r.prop?.summary], q))
      .sort((a, b) => b.vote.castAt.localeCompare(a.vote.castAt))
  }, [votes.data, votings.data, sessions.data, props.data, id, q, lk])
  const pg = usePagination(rows, 10)

  if ([votes, votings, sessions, props, attendance].some((x) => x.isLoading)) return <PageSkeleton />
  const myAttendance = (attendance.data ?? []).filter((a) => a.councilorId === id).sort((a, b) => (b.registeredAt ?? '').localeCompare(a.registeredAt ?? ''))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu histórico"
        description="Votos registrados (exceto votações secretas, que não são associadas ao vereador) e presenças."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadFile(
                'meus-votos.csv',
                toCsv(
                  [
                    { header: 'Identificador', value: (r) => r.vote.code },
                    { header: 'Data/hora', value: (r) => formatDateTime(r.vote.castAt) },
                    { header: 'Matéria', value: (r) => (r.prop ? lk.code(r.prop) : '') },
                    { header: 'Voto', value: (r) => VoteChoiceMeta[r.vote.choice].label },
                    { header: 'Resultado', value: (r) => r.voting?.result?.outcome ?? '' },
                  ],
                  rows,
                ),
              )
            }
          >
            <Download /> Exportar CSV
          </Button>
        }
      />
      <Card>
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar por matéria ou identificador" />
        </Toolbar>
        {pg.total === 0 ? (
          <EmptyState icon={ScrollText} title="Nenhum voto encontrado" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Identificador</TH>
                <TH>Data/hora</TH>
                <TH>Matéria</TH>
                <TH>Sessão</TH>
                <TH>Voto</TH>
                <TH>Resultado</TH>
              </TR>
            </THead>
            <TBody>
              {pg.slice.map((r) => (
                <TR key={r.vote.id}>
                  <TD className="font-mono text-xs">{r.vote.code}</TD>
                  <TD className="whitespace-nowrap tabular">{formatDateTime(r.vote.castAt)}</TD>
                  <TD>
                    {r.prop ? (
                      <Link to={`/vereador/materias/${r.prop.id}`} className="font-medium text-primary hover:underline">
                        {lk.code(r.prop)}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">{r.session ? `${SessionTypeLabel[r.session.type]} ${r.session.number}/${r.session.year}` : '—'}</TD>
                  <TD>
                    <Badge tone={VoteChoiceMeta[r.vote.choice].tone}>{VoteChoiceMeta[r.vote.choice].label}</Badge>
                  </TD>
                  <TD>{r.voting?.result ? <OutcomeSeal outcome={r.voting.result.outcome} size="sm" /> : <span className="text-muted-foreground">Em andamento</span>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination {...pg} />
      </Card>

      <Card>
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Presenças</h2>
        </div>
        <ul className="divide-y">
          {myAttendance.map((a) => {
            const s = sessions.data?.find((x) => x.id === a.sessionId)
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="font-medium">{s ? `${SessionTypeLabel[s.type]} nº ${s.number}/${s.year}` : a.sessionId}</span>
                <span className="text-muted-foreground">{s && formatDate(s.date)}</span>
                <Badge tone={AttendanceStatusMeta[a.status].tone} dot className="ml-auto">
                  {AttendanceStatusMeta[a.status].label}
                </Badge>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
