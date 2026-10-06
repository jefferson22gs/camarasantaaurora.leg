import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Card } from '@/components/ui/display'
import { PageHeader } from '@/components/common/page'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/states'
import { Crest } from '@/components/common/Brand'
import { useAreaBase, useCollection, useLookups, useOrganization, useSettings } from '@/hooks/useData'
import { OUTCOME_LABEL } from '@/domain/voting/votingEngine'
import { AgendaItemStatusMeta, AttendanceStatusMeta, AuthorTypeLabel, SessionStatusMeta, SessionTypeLabel, VotingMethodLabel } from '@/domain/labels'
import { formatDate, formatDateLong, formatDateTime, formatTime } from '@/lib/format'
import type { Councilor, Vote } from '@/types'
import { sessionTitle } from './utils'

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid-page">
      <h2 className="mb-2 font-sans text-sm font-bold uppercase tracking-wide">
        {n}. {title}
      </h2>
      <div className="text-[15px] leading-relaxed">{children}</div>
    </section>
  )
}

/** Prévia da Ata gerada automaticamente a partir dos dados da sessão. */
export default function MinutesPage() {
  const { id = '' } = useParams()
  const base = useAreaBase()
  const { data: org } = useOrganization()
  const { data: settings } = useSettings()
  const lk = useLookups()
  const sessions = useCollection('sessions')
  const attendance = useCollection('attendance')
  const councilors = useCollection('councilors')
  const agendas = useCollection('agendas')
  const propositions = useCollection('propositions')
  const votings = useCollection('votings')
  const votes = useCollection('votes')
  const movements = useCollection('movements')

  const session = sessions.data?.find((s) => s.id === id)
  const propMap = useMemo(() => new Map((propositions.data ?? []).map((p) => [p.id, p])), [propositions.data])

  const data = useMemo(() => {
    if (!session) return null
    const records = (attendance.data ?? []).filter((a) => a.sessionId === id)
    const members = (councilors.data ?? []).filter((c) => c.status === 'active' && c.legislatureId === session.legislatureId)
    const byName = (a: Councilor, b: Councilor) => a.parliamentaryName.localeCompare(b.parliamentaryName, 'pt-BR')
    const statusOf = (cid: string) => records.find((r) => r.councilorId === cid)
    const present = members.filter((m) => statusOf(m.id)?.status === 'present').sort(byName)
    const absent = members.filter((m) => statusOf(m.id)?.status !== 'present').sort(byName)
    const items = [...((agendas.data ?? []).find((a) => a.sessionId === id)?.items ?? [])].sort((a, b) => a.order - b.order)
    const sessionVotings = (votings.data ?? []).filter((v) => v.sessionId === id && v.status !== 'idle').sort((a, b) => (a.openedAt ?? '').localeCompare(b.openedAt ?? ''))
    const votesByVoting = new Map<string, Vote[]>()
    for (const v of votes.data ?? []) if (v.sessionId === id) votesByVoting.set(v.votingId, [...(votesByVoting.get(v.votingId) ?? []), v])
    const after = session.openedAt ?? `${session.date}T00:00:00`
    const referrals = (movements.data ?? []).filter((m) => m.at >= after && items.some((i) => i.propositionId === m.propositionId) && m.stage !== 'voting' && m.action !== 'Votação em Plenário').sort((a, b) => a.at.localeCompare(b.at))
    return { present, absent, statusOf, items, sessionVotings, votesByVoting, referrals }
  }, [session, attendance.data, councilors.data, agendas.data, votings.data, votes.data, movements.data, id])

  if (sessions.isLoading) return <PageSkeleton />
  if (sessions.isError) return <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
  if (!session || !data) return <EmptyState icon={FileText} title="Sessão não encontrada" />

  const secretary = (councilors.data ?? []).find((c) => c.boardRole === 'first_secretary' && c.status === 'active')
  const labels = settings?.voting.labels ?? { yes: 'SIM', no: 'NÃO', abstention: 'ABSTENÇÃO' }
  const choiceLabel = { yes: labels.yes, no: labels.no, abstention: labels.abstention }
  const isDraft = session.status !== 'closed'

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Ata da sessão"
          description={`Prévia gerada automaticamente — ${sessionTitle(session)}.`}
          breadcrumb={[{ label: 'Início', to: base }, { label: 'Sessões', to: `${base}/sessoes` }, { label: `${SessionTypeLabel[session.type]} nº ${session.number}/${session.year}`, to: `${base}/sessoes/${id}` }, { label: 'Ata' }]}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link to={`${base}/sessoes/${id}`}>
                  <ArrowLeft /> Voltar
                </Link>
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <FileText /> Gerar versão para impressão
              </Button>
              <Button onClick={() => window.print()}>
                <Printer /> Imprimir
              </Button>
            </>
          }
        />
        {isDraft && (
          <Alert tone="info" className="mb-5" title="Minuta">
            A sessão está com situação “{SessionStatusMeta[session.status].label}”. O conteúdo da ata será atualizado conforme os registros da sessão. Para salvar em PDF, use “Imprimir” e selecione “Salvar como PDF”.
          </Alert>
        )}
      </div>

      <Card className="print-plain mx-auto max-w-[210mm] px-6 py-10 font-serif sm:px-14 sm:py-14">
        <header className="border-b-2 border-foreground/80 pb-5 text-center">
          <Crest org={org} className="mx-auto size-16" />
          <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{settings?.documents.minutesHeader}</p>
          <p className="mt-1 font-sans text-sm font-semibold">{org?.name}</p>
          <p className="font-sans text-xs text-muted-foreground">
            {org?.address} · CNPJ {org?.cnpj}
          </p>
          <h1 className="mt-5 text-xl font-bold uppercase tracking-wide">
            Ata da {session.number}ª Sessão {SessionTypeLabel[session.type]} de {session.year}
          </h1>
          {isDraft && <p className="mt-1 font-sans text-xs font-semibold uppercase tracking-widest text-warning">Minuta — documento não oficial</p>}
        </header>

        <p className="mt-6 text-[15px] leading-relaxed">
          Aos <span className="capitalize">{formatDateLong(session.date)}</span>, às {session.openedAt ? formatTime(session.openedAt) : session.startTime} horas, no {session.location}, reuniu-se a {org?.name ?? 'Câmara Municipal'} em sessão{' '}
          {SessionTypeLabel[session.type].toLowerCase()}, sob a presidência do Vereador {lk.councilorName(session.presidentId)}, secretariada pelo Vereador {secretary?.parliamentaryName ?? '—'}.
        </p>

        <Section n={1} title="Presenças">
          <p>
            <strong>Presentes ({data.present.length}):</strong> {data.present.length ? data.present.map((c) => `${c.parliamentaryName} (${lk.parties.get(c.partyId)?.acronym ?? '—'})`).join('; ') : 'nenhum registro'}.
          </p>
          <p className="mt-2">
            <strong>Ausentes ({data.absent.length}):</strong>{' '}
            {data.absent.length
              ? data.absent
                  .map((c) => {
                    const r = data.statusOf(c.id)
                    const st = r?.status ?? 'pending'
                    return `${c.parliamentaryName} — ${AttendanceStatusMeta[st].label.toLowerCase()}${r?.justification ? ` (${r.justification})` : ''}`
                  })
                  .join('; ')
              : 'nenhum'}
            .
          </p>
        </Section>

        <Section n={2} title="Expediente">
          <p className="whitespace-pre-line">{session.expedient || 'Não houve matéria de expediente.'}</p>
        </Section>

        <Section n={3} title="Ordem do Dia — matérias apreciadas">
          {data.items.length === 0 ? (
            <p>Não houve matérias em pauta.</p>
          ) : (
            <ol className="space-y-3">
              {data.items.map((i) => {
                const p = propMap.get(i.propositionId)
                return (
                  <li key={i.id}>
                    <strong>
                      Item {String(i.order).padStart(2, '0')} — {p ? lk.title(p) : i.propositionId}
                    </strong>
                    {p && (
                      <>
                        , de autoria de {p.authorType === 'councilor' ? `Vereador(a) ${p.authorName}` : p.authorName || AuthorTypeLabel[p.authorType]}. Ementa: {p.summary}
                      </>
                    )}{' '}
                    <em>({AgendaItemStatusMeta[i.status].label}.)</em>
                  </li>
                )
              })}
            </ol>
          )}
        </Section>

        <Section n={4} title="Discussões">
          {data.items.some((i) => i.discussionStartedAt) ? (
            <ul className="space-y-1.5">
              {data.items
                .filter((i) => i.discussionStartedAt)
                .map((i) => {
                  const p = propMap.get(i.propositionId)
                  return (
                    <li key={i.id}>
                      {p ? lk.code(p) : i.propositionId}: discussão aberta às {formatTime(i.discussionStartedAt)}
                      {i.discussionEndedAt ? ` e encerrada às ${formatTime(i.discussionEndedAt)}` : ''}.
                    </li>
                  )
                })}
            </ul>
          ) : (
            <p>As matérias foram submetidas à votação sem registro eletrônico de discussão.</p>
          )}
        </Section>

        <Section n={5} title="Votações e resultados">
          {data.sessionVotings.length === 0 ? (
            <p>Não houve votações nesta sessão.</p>
          ) : (
            <div className="space-y-5">
              {data.sessionVotings.map((v) => {
                const p = propMap.get(v.propositionId)
                const r = v.result
                const list = (data.votesByVoting.get(v.id) ?? []).filter((x) => x.councilorId)
                return (
                  <div key={v.id} className="break-inside-avoid">
                    <p>
                      <strong>{p ? lk.title(p) : v.propositionId}</strong> — votação {VotingMethodLabel[v.method].toLowerCase()}
                      {v.round > 1 ? ` (${v.round}ª rodada)` : ''}, quórum: {v.quorumRule.name.toLowerCase()}. Aberta às {formatTime(v.openedAt)}
                      {v.closedAt ? `, encerrada às ${formatTime(v.closedAt)}` : ''}.
                    </p>
                    {v.status === 'cancelled' ? (
                      <p className="mt-1">
                        <strong>Votação anulada.</strong> {v.cancelReason}
                      </p>
                    ) : r ? (
                      <p className="mt-1">
                        {v.method === 'symbolic' ? 'Resultado declarado pela Presidência: ' : 'Resultado apurado: '}
                        {labels.yes} {r.yes}; {labels.no} {r.no}; {labels.abstention} {r.abstention}
                        {v.method !== 'symbolic' ? `; não votaram ${r.notVoted}` : ''}; presentes {r.present}; impedidos {r.impeded}. <strong>Resultado: {OUTCOME_LABEL[r.outcome]}</strong>
                        {r.tieBrokenByPresident ? ' (com voto de desempate do Presidente)' : ''}.
                      </p>
                    ) : (
                      <p className="mt-1">Votação em andamento.</p>
                    )}
                    {v.method === 'nominal' && list.length > 0 && (
                      <table className="mt-2 w-full border-collapse font-sans text-sm">
                        <thead>
                          <tr className="border-b border-foreground/40 text-left">
                            <th className="py-1 pr-3 font-semibold">Vereador</th>
                            <th className="py-1 pr-3 font-semibold">Partido</th>
                            <th className="py-1 font-semibold">Voto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...list]
                            .sort((a, b) => lk.councilorName(a.councilorId).localeCompare(lk.councilorName(b.councilorId), 'pt-BR'))
                            .map((vote) => (
                              <tr key={vote.id} className="border-b border-border">
                                <td className="py-1 pr-3">{lk.councilorName(vote.councilorId)}</td>
                                <td className="py-1 pr-3">{lk.partyOf(vote.councilorId ?? undefined)?.acronym ?? '—'}</td>
                                <td className="py-1 font-semibold">{choiceLabel[vote.choice]}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                    {v.method === 'secret' && <p className="mt-1 text-sm italic">Votação secreta: registram-se apenas os totais, preservado o sigilo do voto.</p>}
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section n={6} title="Encaminhamentos">
          {data.referrals.length === 0 ? (
            <p>As matérias aprovadas seguem os trâmites regimentais.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.referrals.map((m) => {
                const p = propMap.get(m.propositionId)
                return (
                  <li key={m.id}>
                    {p ? lk.code(p) : m.propositionId}: {m.action} ({m.from} → {m.to}) em {formatDate(m.at)}.
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section n={7} title="Encerramento">
          <p>
            {settings?.documents.minutesFooter}
            {session.closedAt ? ` Encerrada às ${formatTime(session.closedAt)}.` : ''}
          </p>
        </Section>

        <div className="mt-16 grid gap-12 font-sans text-sm sm:grid-cols-2">
          {[
            { name: lk.councilorName(session.presidentId), role: 'Presidente' },
            { name: secretary?.parliamentaryName ?? '—', role: '1º Secretário' },
          ].map((sig) => (
            <div key={sig.role} className="text-center">
              <div className="mx-auto mb-1.5 h-px w-56 bg-foreground/70" />
              <p className="font-semibold">{sig.name}</p>
              <p className="text-xs text-muted-foreground">{sig.role}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center font-sans text-[10px] text-muted-foreground">
          Documento gerado em {formatDateTime(new Date())} pelo {org?.systemName}. Versão demonstrativa — a assinatura digital será incorporada na fase de backend.
        </p>
      </Card>
    </>
  )
}
