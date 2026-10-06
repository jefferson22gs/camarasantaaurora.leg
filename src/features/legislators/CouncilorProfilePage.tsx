import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, FileText, Mail, Phone, ShieldCheck, Users, Vote } from 'lucide-react'
import { Alert, Avatar, Badge, Card, CardContent, CardHeader, CardTitle, DescriptionList, StatusBadge } from '@/components/ui/display'
import { EmptyState, PageSkeleton } from '@/components/common/states'
import { PageHeader, StatCard } from '@/components/common/page'
import { useCollection, useLookups } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { BoardRoleLabel, CommitteeKindLabel, CouncilorStatusMeta, PropositionStatusMeta, VoteChoiceMeta } from '@/domain/labels'
import { formatDate, formatPercent } from '@/lib/format'
import { councilorStats } from './councilorStats'

/** Perfil do vereador autenticado — somente leitura. */
export default function CouncilorProfilePage() {
  const user = useAuthStore((s) => s.user)
  const lk = useLookups()
  const councilors = useCollection('councilors')
  const propositions = useCollection('propositions')
  const attendance = useCollection('attendance')
  const votes = useCollection('votes')
  const votings = useCollection('votings')
  const committees = useCollection('committees')
  const legislatures = useCollection('legislatures')

  const councilor = councilors.data?.find((c) => c.id === user?.councilorId)
  const stats = useMemo(
    () => (councilor ? councilorStats(councilor, { propositions: propositions.data, attendance: attendance.data, votes: votes.data, votings: votings.data, committees: committees.data }) : null),
    [councilor, propositions.data, attendance.data, votes.data, votings.data, committees.data],
  )

  if (councilors.isLoading || !lk.ready) return <PageSkeleton />
  if (!councilor || !stats)
    return (
      <>
        <PageHeader title="Meu perfil" />
        <Card>
          <EmptyState icon={Users} title="Usuário sem vínculo de vereador" description="Solicite à Secretaria Legislativa a vinculação do seu usuário ao cadastro de vereador." />
        </Card>
      </>
    )

  const party = lk.parties.get(councilor.partyId)
  const choiceCount = stats.votes.reduce<Record<string, number>>((acc, { vote }) => ({ ...acc, [vote.choice]: (acc[vote.choice] ?? 0) + 1 }), {})

  return (
    <>
      <PageHeader title="Meu perfil" description="Seus dados cadastrais e indicadores de atuação parlamentar." breadcrumb={[{ label: 'Início', to: '/vereador/dashboard' }, { label: 'Meu perfil' }]} />

      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand to-brand-2/80" aria-hidden />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
          <Avatar name={councilor.parliamentaryName} src={councilor.photoUrl} color={party?.color} className="-mt-10 size-20 border-4 border-card text-2xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{councilor.parliamentaryName}</h2>
            <p className="text-sm text-muted-foreground">{councilor.fullName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>
              <span className="size-2 rounded-full" style={{ background: party?.color }} aria-hidden />
              {party?.acronym}
            </Badge>
            {councilor.boardRole && <Badge tone="primary">{BoardRoleLabel[councilor.boardRole]}</Badge>}
            <StatusBadge meta={CouncilorStatusMeta[councilor.status]} />
          </div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Proposições" value={stats.authored.length} icon={FileText} hint="Autoria e coautoria" />
        <StatCard label="Presença" value={formatPercent(stats.attendanceRate)} icon={CalendarCheck} tone="success" hint={`${stats.present} de ${stats.attendance.length} sessões`} />
        <StatCard label="Votos registrados" value={stats.votes.length} icon={Vote} tone="info" hint={`${choiceCount.yes ?? 0} ${VoteChoiceMeta.yes.label} · ${choiceCount.no ?? 0} ${VoteChoiceMeta.no.label} · ${choiceCount.abstention ?? 0} abst.`} />
        <StatCard label="Comissões" value={stats.committees.length} icon={Users} tone="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dados do mandato</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                { label: 'Partido', value: party ? `${party.acronym} — ${party.name}` : '—' },
                { label: 'Legislatura', value: legislatures.data?.find((l) => l.id === councilor.legislatureId)?.name },
                { label: 'Mandato', value: councilor.mandate === 'holder' ? 'Titular' : 'Suplente' },
                { label: 'Período', value: `${formatDate(councilor.mandateStart)} a ${formatDate(councilor.mandateEnd)}` },
                {
                  label: 'E-mail',
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="size-3.5 text-muted-foreground" aria-hidden /> {councilor.email}
                    </span>
                  ),
                },
                {
                  label: 'Telefone',
                  value: (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5 text-muted-foreground" aria-hidden /> {councilor.phone}
                    </span>
                  ),
                },
                { label: 'Biografia', value: councilor.bio || '—', full: true },
              ]}
            />
            <Alert tone="info" className="mt-5 text-xs">
              Alterações cadastrais devem ser solicitadas à Secretaria Legislativa.
            </Alert>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comissões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.committees.length === 0 && <p className="text-sm text-muted-foreground">Não integra comissões.</p>}
              {stats.committees.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.acronym} · {CommitteeKindLabel[c.kind]}
                    </p>
                  </div>
                  <Badge tone={c.presidentId === councilor.id ? 'primary' : 'neutral'}>{c.presidentId === councilor.id ? 'Presidente' : c.vicePresidentId === councilor.id ? 'Vice' : 'Membro'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Proposições recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.authored.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma proposição.</p>}
              {[...stats.authored]
                .sort((a, b) => b.presentedAt.localeCompare(a.presentedAt))
                .slice(0, 5)
                .map((p) => (
                  <Link key={p.id} to={`/vereador/materias/${p.id}`} className="block rounded-lg border p-3 hover:bg-muted/50">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{lk.code(p)}</span>
                      <StatusBadge meta={PropositionStatusMeta[p.status]} />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{p.summary}</span>
                  </Link>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" aria-hidden /> Votos secretos não são associados ao seu perfil.
      </p>
    </>
  )
}
