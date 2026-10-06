import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Printer, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/display'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection, useLookups, useOrganization, useSettings } from '@/hooks/useData'
import { OUTCOME_LABEL } from '@/domain/voting/votingEngine'
import { VotingMethodLabel } from '@/domain/labels'
import { formatDateLong, formatTime } from '@/lib/format'
import type { Session } from '@/types'
import { DateBlock, PublicContainer, PublicPageHeader, sessionTitle, useIndex, usePublicVotings, useVoteLabels } from './shared'

/** Versão pública e simplificada da ata, montada a partir dos registros da sessão. */
function PublicMinutes({ session }: { session: Session }) {
  const { data: org } = useOrganization()
  const { data: settings } = useSettings()
  const lk = useLookups()
  const attendance = useCollection('attendance')
  const agendas = useCollection('agendas')
  const propositions = useCollection('propositions')
  const votings = usePublicVotings()
  const votes = useCollection('votes')
  const labels = useVoteLabels()
  const propIndex = useIndex(propositions.data)

  const rows = (attendance.data ?? []).filter((a) => a.sessionId === session.id)
  const present = rows.filter((a) => a.status === 'present').map((a) => lk.councilorName(a.councilorId)).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const absent = rows.filter((a) => a.status !== 'present' && a.status !== 'pending').map((a) => `${lk.councilorName(a.councilorId)}${a.status === 'justified' ? ' (justificada)' : ''}`)
  const agenda = (agendas.data ?? []).find((a) => a.sessionId === session.id)
  const sessionVotings = (votings.data ?? []).filter((v) => v.sessionId === session.id)
  const publishNominal = settings?.transparency.publishNominalVotes ?? false

  return (
    <article className="mx-auto max-w-3xl font-serif text-[15px] leading-relaxed">
      <header className="border-b pb-4 text-center">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{settings?.documents.minutesHeader ?? org?.name}</p>
        <h2 className="mt-2 text-xl font-semibold uppercase">Ata da {sessionTitle(session)}</h2>
      </header>
      <div className="prose-legal mt-5">
        <p>
          Aos <span className="capitalize">{formatDateLong(session.date)}</span>, às {formatTime(session.openedAt) !== '—' ? formatTime(session.openedAt) : session.startTime}, no {session.location}, reuniu-se a {org?.name} sob a presidência do
          Vereador {lk.councilorName(session.presidentId)}.
        </p>
        <p>
          <strong>Presentes ({present.length}):</strong> {present.join(', ') || '—'}. <strong>Ausentes:</strong> {absent.join(', ') || 'nenhum'}.
        </p>
        {session.expedient && (
          <p>
            <strong>Expediente:</strong> {session.expedient}
          </p>
        )}
        <p>
          <strong>Ordem do Dia:</strong>
        </p>
        <ol className="mb-4 list-decimal space-y-3 pl-6">
          {[...(agenda?.items ?? [])]
            .sort((a, b) => a.order - b.order)
            .map((i) => {
              const p = propIndex.get(i.propositionId)
              const v = sessionVotings.find((x) => x.agendaItemId === i.id)
              const nominal = v && v.method === 'nominal' && publishNominal ? (votes.data ?? []).filter((x) => x.votingId === v.id && x.councilorId) : []
              return (
                <li key={i.id}>
                  <strong>{p ? lk.title(p) : 'Matéria'}</strong> — {p?.summary}
                  {v ? (
                    <>
                      {' '}
                      Submetida à votação {VotingMethodLabel[v.method].toLowerCase()}, foi <strong>{OUTCOME_LABEL[v.result.outcome]}</strong> com {v.result.yes} votos favoráveis, {v.result.no} contrários e {v.result.abstention}{' '}
                      abstenções.
                      {nominal.length > 0 && (
                        <span className="mt-1 block text-sm text-muted-foreground">Votos nominais: {nominal.map((n) => `${lk.councilorName(n.councilorId)} (${labels[n.choice]})`).join('; ')}.</span>
                      )}
                    </>
                  ) : (
                    ' Não houve deliberação.'
                  )}
                </li>
              )
            })}
        </ol>
        <p>{settings?.documents.minutesFooter}</p>
        {session.endTime && <p>Encerramento às {session.endTime}.</p>}
      </div>
    </article>
  )
}

export default function PublicMinutesPage() {
  const sessions = useCollection('sessions')
  const { data: settings } = useSettings()
  const [params, setParams] = useSearchParams()
  const openId = params.get('sessao')

  const closed = useMemo(() => (sessions.data ?? []).filter((s) => s.status === 'closed').sort((a, b) => b.date.localeCompare(a.date)), [sessions.data])
  const selected = closed.find((s) => s.id === openId)

  if (settings && !settings.transparency.publishMinutes)
    return (
      <PublicContainer>
        <PublicPageHeader title="Atas das sessões" crumbs={[{ label: 'Atas' }]} />
        <Card>
          <EmptyState icon={ScrollText} title="Atas não publicadas" description="A publicação das atas no portal está desabilitada pela Câmara." />
        </Card>
      </PublicContainer>
    )

  return (
    <PublicContainer>
      <PublicPageHeader title="Atas das sessões" crumbs={[{ label: 'Atas' }]} description="Registro oficial das sessões plenárias encerradas." />
      <QueryState query={sessions} isEmpty={() => closed.length === 0} empty={<Card><EmptyState icon={ScrollText} title="Nenhuma ata disponível" /></Card>}>
        {() => (
          <ul className="grid gap-3 md:grid-cols-2">
            {closed.map((s) => (
              <li key={s.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                <DateBlock date={s.date} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{sessionTitle(s)}</p>
                  <p className="text-xs capitalize text-muted-foreground">{formatDateLong(s.date)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setParams({ sessao: s.id })}>
                  <ScrollText /> Visualizar ata
                </Button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setParams({})}>
        {selected && (
          <DialogContent
            size="xl"
            title={`Ata — ${sessionTitle(selected)}`}
            footer={
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> Imprimir
              </Button>
            }
          >
            <PublicMinutes session={selected} />
          </DialogContent>
        )}
      </Dialog>
    </PublicContainer>
  )
}
