import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, EyeOff, Hand, Minus, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Avatar, Card, CardContent, CardHeader, CardTitle, DescriptionList } from '@/components/ui/display'
import { PageSkeleton } from '@/components/common/states'
import { OutcomeSeal, VotingSummary } from '@/components/common/VotingSummary'
import { useCollection, useLookups, useSettings } from '@/hooks/useData'
import { VotingMethodLabel } from '@/domain/labels'
import { formatDateTimeShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VoteChoice } from '@/types'
import { PUBLIC_BASE, PublicContainer, PublicNotFound, PublicPageHeader, sessionTitle, usePublicVotings, useVoteLabels } from './shared'

const CHOICE_STYLE: Record<VoteChoice, { icon: typeof Check; cls: string }> = {
  yes: { icon: Check, cls: 'text-success bg-success-soft' },
  no: { icon: X, cls: 'text-danger bg-danger-soft' },
  abstention: { icon: Minus, cls: 'text-warning bg-warning-soft' },
}

export default function PublicVotingDetailPage() {
  const { id } = useParams()
  const votings = usePublicVotings()
  const propositions = useCollection('propositions')
  const sessions = useCollection('sessions')
  const votes = useCollection('votes')
  const { data: settings } = useSettings()
  const labels = useVoteLabels()
  const lk = useLookups()

  const v = votings.data?.find((x) => x.id === id)
  const p = propositions.data?.find((x) => x.id === v?.propositionId)
  const s = sessions.data?.find((x) => x.id === v?.sessionId)
  const publishNominal = (settings?.transparency.publishNominalVotes ?? false) && v?.method === 'nominal'

  const nominal = useMemo(() => {
    if (!v || !publishNominal) return []
    const byCouncilor = new Map((votes.data ?? []).filter((x) => x.votingId === v.id && x.councilorId).map((x) => [x.councilorId as string, x.choice]))
    return v.memberIds
      .map((cid) => ({
        id: cid,
        name: lk.councilorName(cid),
        party: lk.partyOf(cid),
        choice: byCouncilor.get(cid),
        state: v.impededIds.includes(cid) ? 'Impedido' : !v.presentIds.includes(cid) ? 'Ausente' : !v.eligibleIds.includes(cid) ? 'Não vota (Presidente)' : 'Não votou',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [v, publishNominal, votes.data, lk])

  if (votings.isLoading || propositions.isLoading || !lk.ready) return <PublicContainer><PageSkeleton /></PublicContainer>
  if (!v) return <PublicNotFound title="Votação não encontrada" backTo={`${PUBLIC_BASE}/votacoes`} backLabel="Voltar às votações" />

  const r = v.result
  const title = p ? lk.title(p) : 'Matéria'

  return (
    <PublicContainer>
      <PublicPageHeader
        title={title}
        crumbs={[{ label: 'Votações', to: `${PUBLIC_BASE}/votacoes` }, { label: p ? lk.code(p) : 'Votação' }]}
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir resultado
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5">
              {p && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ementa</p>
                  <p className="mt-1.5 font-serif text-lg leading-relaxed">{p.summary}</p>
                  <Link to={`${PUBLIC_BASE}/proposicoes/${p.id}`} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                    Ver proposição e tramitação
                  </Link>
                </div>
              )}
              <div className="flex flex-col items-start gap-3 rounded-xl border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resultado</p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.explanation}</p>
                </div>
                <OutcomeSeal outcome={r.outcome} size="lg" />
              </div>
              <VotingSummary tally={r} showPending={false} />
            </CardContent>
          </Card>

          {v.method === 'nominal' && publishNominal && (
            <Card>
              <CardHeader>
                <CardTitle>Votos nominais</CardTitle>
              </CardHeader>
              <ul className="divide-y">
                {nominal.map((n) => {
                  const style = n.choice ? CHOICE_STYLE[n.choice] : null
                  return (
                    <li key={n.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={n.name} color={n.party?.color} src={lk.councilors.get(n.id)?.photoUrl} className="size-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{n.name}</span>
                        <span className="text-xs text-muted-foreground">{n.party?.acronym}</span>
                      </span>
                      {style && n.choice ? (
                        <span className={cn('inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold', style.cls)}>
                          <style.icon className="size-3.5" aria-hidden /> {labels[n.choice]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{n.state}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
          {v.method === 'nominal' && !publishNominal && <Alert tone="info" title="Votos nominais não publicados">A Câmara optou por divulgar apenas o placar desta votação.</Alert>}
          {v.method === 'secret' && (
            <Alert tone="info" title="Votação secreta">
              <span className="inline-flex items-start gap-1.5">
                <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden /> O voto é sigiloso. Apenas o resultado consolidado é divulgado; não há associação entre vereador e voto.
              </span>
            </Alert>
          )}
          {v.method === 'symbolic' && (
            <Alert tone="info" title="Votação simbólica">
              <span className="inline-flex items-start gap-1.5">
                <Hand className="mt-0.5 size-4 shrink-0" aria-hidden /> O resultado foi declarado pela Presidência, sem identificação individual dos votos.
              </span>
            </Alert>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Dados da votação</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              columns={1}
              items={[
                {
                  label: 'Sessão',
                  value: s ? (
                    <Link to={`${PUBLIC_BASE}/sessoes/${s.id}`} className="text-primary hover:underline">
                      {sessionTitle(s)}
                    </Link>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Modalidade', value: VotingMethodLabel[v.method] },
                { label: 'Quórum', value: v.quorumRule.name },
                { label: 'Votos necessários', value: r.requiredVotes },
                { label: 'Início', value: formatDateTimeShort(v.openedAt) },
                { label: 'Encerramento', value: formatDateTimeShort(v.closedAt) },
                { label: 'Presentes / Aptos', value: `${r.present} / ${r.eligible}` },
                { label: 'Impedidos', value: r.impeded },
                { label: 'Não votaram', value: r.notVoted },
                ...(r.tieBrokenByPresident ? [{ label: 'Desempate', value: 'Voto de desempate do Presidente' }] : []),
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </PublicContainer>
  )
}
