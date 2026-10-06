import { Ban, Check, Clock, EyeOff, Minus, UserCheck, Users, X } from 'lucide-react'
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { VoteChoiceMeta } from '@/domain/labels'
import { useLookups } from '@/hooks/useData'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Vote, VoteTally, Voting } from '@/types'

const CARD_TONE = {
  neutral: 'text-foreground',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  violet: 'text-violet',
  muted: 'text-muted-foreground',
}

/** Indicadores da votação para a Presidência: Aptos, Presentes, SIM, NÃO, Abstenções, Impedidos, Não votaram. */
export function VotingCounters({ tally, labels }: { tally: VoteTally; labels: { yes: string; no: string; abstention: string } }) {
  const items: Array<{ label: string; value: number; icon: typeof Users; tone: keyof typeof CARD_TONE }> = [
    { label: 'Aptos', value: tally.eligible, icon: UserCheck, tone: 'neutral' },
    { label: 'Presentes', value: tally.present, icon: Users, tone: 'neutral' },
    { label: labels.yes, value: tally.yes, icon: Check, tone: 'success' },
    { label: labels.no, value: tally.no, icon: X, tone: 'danger' },
    { label: 'Abstenções', value: tally.abstention, icon: Minus, tone: 'warning' },
    { label: 'Impedidos', value: tally.impeded, icon: Ban, tone: 'violet' },
    { label: 'Não votaram', value: tally.notVoted, icon: Clock, tone: 'muted' },
  ]
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border bg-card p-3">
          <dt className={cn('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide', CARD_TONE[i.tone])}>
            <i.icon className="size-3.5" aria-hidden /> {i.label}
          </dt>
          <dd className="mt-1 text-2xl font-extrabold tabular" aria-live="polite">
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Tabela nominal em tempo real: Vereador | Situação | Voto.
 * Secreta: mostra apenas participação (nunca o voto). Simbólica: não há registro individual.
 */
export function NominalTable({ voting, votes }: { voting: Voting; votes: Vote[] }) {
  const lk = useLookups()
  const secret = voting.method === 'secret'
  const rows = voting.memberIds.map((id) => {
    const vote = secret ? undefined : votes.find((v) => v.councilorId === id)
    const voted = voting.participantIds.includes(id)
    const state = voting.impededIds.includes(id)
      ? { label: 'IMPEDIDO', tone: 'accent' as const }
      : !voting.presentIds.includes(id)
        ? { label: 'Ausente', tone: 'neutral' as const }
        : !voting.eligibleIds.includes(id)
          ? { label: 'Presidente (não vota)', tone: 'info' as const }
          : voted
            ? { label: 'Votou', tone: 'success' as const }
            : { label: 'Aguardando', tone: 'warning' as const }
    return { id, vote, voted, state }
  })
  rows.sort((a, b) => Number(b.voted) - Number(a.voted) || lk.councilorName(a.id).localeCompare(lk.councilorName(b.id)))

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle>{secret ? 'Participação na votação secreta' : 'Votação nominal — tempo real'}</CardTitle>
        {secret && (
          <Badge tone="accent">
            <EyeOff /> Voto sigiloso
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Vereador</TH>
              <TH>Situação</TH>
              <TH className="text-right">{secret ? 'Participação' : 'Voto'}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => {
              const party = lk.partyOf(r.id)
              return (
                <TR key={r.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={lk.councilorName(r.id)} src={lk.councilors.get(r.id)?.photoUrl} color={party?.color} className="size-8" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{lk.councilorName(r.id)}</p>
                        <p className="text-xs text-muted-foreground">{party?.acronym}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={r.state.tone} dot>
                      {r.state.label}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {secret ? (
                      r.voted ? (
                        <span className="text-sm font-medium text-success">Registrado</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : r.vote ? (
                      <span className="inline-flex flex-col items-end">
                        <Badge tone={VoteChoiceMeta[r.vote.choice].tone} className="text-sm font-bold">
                          {VoteChoiceMeta[r.vote.choice].label}
                        </Badge>
                        <span className="mt-0.5 text-[11px] text-muted-foreground tabular">{formatTime(r.vote.castAt)}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  )
}
