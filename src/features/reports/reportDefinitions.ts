import type { ComponentType } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, FileText, Landmark, MinusCircle, ScrollText, UserCheck, Users, Vote as VoteIcon, Workflow, XCircle, Layers, BookOpen } from 'lucide-react'
import type { CsvColumn } from '@/lib/csv'
import type { Lookups } from '@/hooks/useData'
import { formatDate, formatDateTimeShort, formatPercent } from '@/lib/format'
import { APPROVED_STATUSES, OpinionConclusionMeta, PropositionStatusMeta, REJECTED_STATUSES, SessionStatusMeta, SessionTypeLabel, VoteChoiceMeta, VotingMethodLabel } from '@/domain/labels'
import { OUTCOME_LABEL } from '@/domain/voting/votingEngine'
import { filterPropositions, type DashboardFilters } from '@/features/dashboard/useDashboardData'
import type { Agenda, Attendance, Legislature, Opinion, ProcessMovement, Proposition, Session, Vote, Voting } from '@/types'

/** Dados brutos disponíveis para todos os relatórios. */
export interface ReportData {
  propositions: Proposition[]
  sessions: Session[]
  attendance: Attendance[]
  votings: Voting[]
  votes: Vote[]
  movements: ProcessMovement[]
  opinions: Opinion[]
  agendas: Agenda[]
  legislatures: Legislature[]
  lk: Lookups
}

export type Row = Record<string, string | number>

export interface ReportDefinition {
  id: string
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  group: 'Proposições' | 'Plenário' | 'Votações'
  /** Filtros aplicáveis a este relatório. */
  filters: Array<keyof DashboardFilters>
  columns: CsvColumn<Row>[]
  build: (d: ReportData, f: DashboardFilters) => Row[]
}

const col = (header: string, key: string): CsvColumn<Row> => ({ header, value: (r) => r[key] })
const inRange = (date: string, f: DashboardFilters) => (!f.from || date.slice(0, 10) >= f.from) && (!f.to || date.slice(0, 10) <= f.to)
const PROP_FILTERS: Array<keyof DashboardFilters> = ['from', 'to', 'legislatureId', 'councilorId', 'committeeId', 'typeId', 'status']

const sessionName = (s?: Session) => (s ? `${SessionTypeLabel[s.type]} nº ${s.number}/${s.year}` : '—')

function propRow(p: Proposition, lk: Lookups): Row {
  return {
    codigo: lk.code(p),
    tipo: lk.types.get(p.typeId)?.name ?? '—',
    ementa: p.summary,
    autor: p.authorName,
    apresentacao: formatDate(p.presentedAt),
    situacao: PropositionStatusMeta[p.status].label,
    comissoes: p.committeeIds.map((id) => lk.committees.get(id)?.acronym ?? id).join(', ') || '—',
    relator: lk.councilorName(p.rapporteurId),
  }
}

const PROP_COLUMNS = [col('Proposição', 'codigo'), col('Tipo', 'tipo'), col('Ementa', 'ementa'), col('Autor', 'autor'), col('Apresentação', 'apresentacao'), col('Situação', 'situacao')]

const filteredSessions = (d: ReportData, f: DashboardFilters) => d.sessions.filter((s) => inRange(s.date, f) && (!f.legislatureId || s.legislatureId === f.legislatureId))

function closedVotings(d: ReportData, f: DashboardFilters) {
  const props = new Set(filterPropositions(d.propositions, { ...f, from: '', to: '' }, d.legislatures).map((p) => p.id))
  const sess = new Set(filteredSessions(d, f).map((s) => s.id))
  return d.votings.filter((v) => v.status === 'closed' && v.result && sess.has(v.sessionId) && props.has(v.propositionId))
}

function votingRow(v: Voting, d: ReportData): Row {
  const p = d.propositions.find((x) => x.id === v.propositionId)
  const r = v.result!
  return {
    data: formatDateTimeShort(v.closedAt ?? v.openedAt),
    sessao: sessionName(d.sessions.find((s) => s.id === v.sessionId)),
    materia: p ? d.lk.code(p) : '—',
    modalidade: VotingMethodLabel[v.method],
    quorum: v.quorumRule.name,
    sim: r.yes,
    nao: r.no,
    abstencoes: r.abstention,
    naoVotaram: r.notVoted,
    resultado: OUTCOME_LABEL[r.outcome],
  }
}

export const REPORTS: ReportDefinition[] = [
  {
    id: 'props-period',
    title: 'Projetos por período',
    description: 'Proposições apresentadas no intervalo selecionado.',
    icon: FileText,
    group: 'Proposições',
    filters: PROP_FILTERS,
    columns: [...PROP_COLUMNS, col('Comissões', 'comissoes')],
    build: (d, f) => filterPropositions(d.propositions, f, d.legislatures).sort((a, b) => b.presentedAt.localeCompare(a.presentedAt)).map((p) => propRow(p, d.lk)),
  },
  {
    id: 'props-councilor',
    title: 'Projetos por vereador',
    description: 'Quantidade de proposições de autoria e coautoria.',
    icon: Landmark,
    group: 'Proposições',
    filters: PROP_FILTERS,
    columns: [col('Vereador', 'vereador'), col('Partido', 'partido'), col('Autoria', 'autoria'), col('Coautoria', 'coautoria'), col('Aprovadas', 'aprovadas'), col('Total', 'total')],
    build: (d, f) => {
      const props = filterPropositions(d.propositions, { ...f, councilorId: '' }, d.legislatures)
      return [...d.lk.councilors.values()]
        .filter((c) => !f.councilorId || c.id === f.councilorId)
        .map((c) => {
          const author = props.filter((p) => p.authorId === c.id)
          const co = props.filter((p) => p.coauthorIds.includes(c.id))
          return {
            vereador: c.parliamentaryName,
            partido: d.lk.parties.get(c.partyId)?.acronym ?? '—',
            autoria: author.length,
            coautoria: co.length,
            aprovadas: [...author, ...co].filter((p) => APPROVED_STATUSES.includes(p.status)).length,
            total: author.length + co.length,
          }
        })
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total)
    },
  },
  {
    id: 'props-status',
    title: 'Projetos por situação',
    description: 'Distribuição das proposições por situação atual.',
    icon: Layers,
    group: 'Proposições',
    filters: PROP_FILTERS,
    columns: [col('Situação', 'situacao'), col('Quantidade', 'quantidade'), col('Percentual', 'percentual')],
    build: (d, f) => {
      const props = filterPropositions(d.propositions, f, d.legislatures)
      const map = new Map<string, number>()
      for (const p of props) map.set(PropositionStatusMeta[p.status].label, (map.get(PropositionStatusMeta[p.status].label) ?? 0) + 1)
      return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([situacao, quantidade]) => ({ situacao, quantidade, percentual: formatPercent(quantidade / (props.length || 1), 1) }))
    },
  },
  {
    id: 'props-committee',
    title: 'Projetos por comissão',
    description: 'Matérias distribuídas e pareceres por comissão.',
    icon: Users,
    group: 'Proposições',
    filters: PROP_FILTERS,
    columns: [col('Comissão', 'comissao'), col('Sigla', 'sigla'), col('Matérias', 'materias'), col('Pareceres concluídos', 'concluidos'), col('Pareceres pendentes', 'pendentes')],
    build: (d, f) => {
      const props = filterPropositions(d.propositions, { ...f, committeeId: '' }, d.legislatures)
      return [...d.lk.committees.values()]
        .filter((c) => !f.committeeId || c.id === f.committeeId)
        .map((c) => {
          const ids = new Set(props.filter((p) => p.committeeIds.includes(c.id)).map((p) => p.id))
          const ops = d.opinions.filter((o) => o.committeeId === c.id && ids.has(o.propositionId))
          return { comissao: c.name, sigla: c.acronym, materias: ids.size, concluidos: ops.filter((o) => o.status === 'completed').length, pendentes: ops.filter((o) => o.status !== 'completed').length }
        })
    },
  },
  {
    id: 'process-movements',
    title: 'Tramitação',
    description: 'Movimentações registradas no processo legislativo.',
    icon: Workflow,
    group: 'Proposições',
    filters: PROP_FILTERS,
    columns: [col('Data/hora', 'data'), col('Proposição', 'materia'), col('Ação', 'acao'), col('Origem', 'origem'), col('Destino', 'destino'), col('Responsável', 'responsavel'), col('Observação', 'obs')],
    build: (d, f) => {
      const props = new Map(filterPropositions(d.propositions, { ...f, from: '', to: '' }, d.legislatures).map((p) => [p.id, p]))
      return d.movements
        .filter((m) => props.has(m.propositionId) && inRange(m.at, f))
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((m) => ({ data: formatDateTimeShort(m.at), materia: d.lk.code(props.get(m.propositionId)!), acao: m.action, origem: m.from, destino: m.to, responsavel: m.responsible, obs: m.notes || '—' }))
    },
  },
  {
    id: 'opinions',
    title: 'Pareceres',
    description: 'Pareceres emitidos e pendentes pelas comissões.',
    icon: BookOpen,
    group: 'Proposições',
    filters: PROP_FILTERS,
    columns: [col('Proposição', 'materia'), col('Comissão', 'comissao'), col('Relator', 'relator'), col('Prazo', 'prazo'), col('Emissão', 'emissao'), col('Conclusão', 'conclusao')],
    build: (d, f) => {
      const props = new Map(filterPropositions(d.propositions, f, d.legislatures).map((p) => [p.id, p]))
      return d.opinions
        .filter((o) => props.has(o.propositionId) && (!f.committeeId || o.committeeId === f.committeeId))
        .map((o) => ({
          materia: d.lk.code(props.get(o.propositionId)!),
          comissao: d.lk.committees.get(o.committeeId)?.acronym ?? '—',
          relator: d.lk.councilorName(o.rapporteurId),
          prazo: formatDate(o.dueDate),
          emissao: formatDate(o.issuedAt),
          conclusao: o.conclusion ? OpinionConclusionMeta[o.conclusion].label : 'Pendente',
        }))
    },
  },
  {
    id: 'approved',
    title: 'Matérias aprovadas',
    description: 'Proposições aprovadas, sancionadas ou promulgadas.',
    icon: CheckCircle2,
    group: 'Proposições',
    filters: ['from', 'to', 'legislatureId', 'councilorId', 'committeeId', 'typeId'],
    columns: PROP_COLUMNS,
    build: (d, f) => filterPropositions(d.propositions, { ...f, status: '' }, d.legislatures).filter((p) => APPROVED_STATUSES.includes(p.status)).map((p) => propRow(p, d.lk)),
  },
  {
    id: 'rejected',
    title: 'Matérias rejeitadas',
    description: 'Proposições rejeitadas em Plenário ou vetadas.',
    icon: XCircle,
    group: 'Proposições',
    filters: ['from', 'to', 'legislatureId', 'councilorId', 'committeeId', 'typeId'],
    columns: PROP_COLUMNS,
    build: (d, f) => filterPropositions(d.propositions, { ...f, status: '' }, d.legislatures).filter((p) => REJECTED_STATUSES.includes(p.status)).map((p) => propRow(p, d.lk)),
  },
  {
    id: 'production',
    title: 'Produção legislativa',
    description: 'Indicadores de produção por tipo de proposição.',
    icon: BarChart3,
    group: 'Proposições',
    filters: PROP_FILTERS,
    columns: [col('Tipo', 'tipo'), col('Apresentadas', 'apresentadas'), col('Em tramitação', 'tramitacao'), col('Aprovadas', 'aprovadas'), col('Rejeitadas', 'rejeitadas'), col('Taxa de aprovação', 'taxa')],
    build: (d, f) => {
      const props = filterPropositions(d.propositions, f, d.legislatures)
      return [...d.lk.types.values()]
        .map((t) => {
          const list = props.filter((p) => p.typeId === t.id)
          const ap = list.filter((p) => APPROVED_STATUSES.includes(p.status)).length
          const rj = list.filter((p) => REJECTED_STATUSES.includes(p.status)).length
          return { tipo: t.name, apresentadas: list.length, tramitacao: list.length - ap - rj, aprovadas: ap, rejeitadas: rj, taxa: ap + rj ? formatPercent(ap / (ap + rj)) : '—' }
        })
        .filter((r) => r.apresentadas > 0)
    },
  },
  {
    id: 'sessions',
    title: 'Sessões',
    description: 'Sessões plenárias realizadas, agendadas e canceladas.',
    icon: CalendarDays,
    group: 'Plenário',
    filters: ['from', 'to', 'legislatureId'],
    columns: [col('Sessão', 'sessao'), col('Data', 'data'), col('Horário', 'horario'), col('Situação', 'situacao'), col('Presentes', 'presentes'), col('Itens em pauta', 'itens'), col('Votações', 'votacoes')],
    build: (d, f) =>
      filteredSessions(d, f)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((s) => ({
          sessao: sessionName(s),
          data: formatDate(s.date),
          horario: `${s.startTime}${s.endTime ? ` – ${s.endTime}` : ''}`,
          situacao: SessionStatusMeta[s.status].label,
          presentes: d.attendance.filter((a) => a.sessionId === s.id && a.status === 'present').length,
          itens: d.agendas.find((a) => a.sessionId === s.id)?.items.length ?? 0,
          votacoes: d.votings.filter((v) => v.sessionId === s.id && v.status === 'closed').length,
        })),
  },
  {
    id: 'attendance',
    title: 'Presença',
    description: 'Frequência dos vereadores nas sessões do período.',
    icon: UserCheck,
    group: 'Plenário',
    filters: ['from', 'to', 'legislatureId', 'councilorId'],
    columns: [col('Vereador', 'vereador'), col('Partido', 'partido'), col('Presenças', 'presencas'), col('Ausências', 'ausencias'), col('Justificadas', 'justificadas'), col('Frequência', 'frequencia')],
    build: (d, f) => {
      const sess = new Set(filteredSessions(d, f).filter((s) => s.status !== 'cancelled' && s.status !== 'scheduled').map((s) => s.id))
      return [...d.lk.councilors.values()]
        .filter((c) => c.status === 'active' && (!f.councilorId || c.id === f.councilorId))
        .map((c) => {
          const rows = d.attendance.filter((a) => a.councilorId === c.id && sess.has(a.sessionId) && a.status !== 'pending')
          const pres = rows.filter((a) => a.status === 'present').length
          return {
            vereador: c.parliamentaryName,
            partido: d.lk.parties.get(c.partyId)?.acronym ?? '—',
            presencas: pres,
            ausencias: rows.filter((a) => a.status === 'absent').length,
            justificadas: rows.filter((a) => a.status === 'justified' || a.status === 'impeded').length,
            frequencia: rows.length ? formatPercent(pres / rows.length) : '—',
          }
        })
    },
  },
  {
    id: 'minutes',
    title: 'Atas',
    description: 'Sessões encerradas com ata disponível.',
    icon: ScrollText,
    group: 'Plenário',
    filters: ['from', 'to', 'legislatureId'],
    columns: [col('Sessão', 'sessao'), col('Data', 'data'), col('Abertura', 'abertura'), col('Encerramento', 'encerramento'), col('Presentes', 'presentes'), col('Matérias votadas', 'votadas')],
    build: (d, f) =>
      filteredSessions(d, f)
        .filter((s) => s.status === 'closed')
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((s) => ({
          sessao: sessionName(s),
          data: formatDate(s.date),
          abertura: s.startTime,
          encerramento: s.endTime ?? '—',
          presentes: d.attendance.filter((a) => a.sessionId === s.id && a.status === 'present').length,
          votadas: d.votings.filter((v) => v.sessionId === s.id && v.status === 'closed').length,
        })),
  },
  {
    id: 'votings',
    title: 'Votações',
    description: 'Votações encerradas com apuração e resultado.',
    icon: VoteIcon,
    group: 'Votações',
    filters: PROP_FILTERS,
    columns: [col('Encerramento', 'data'), col('Sessão', 'sessao'), col('Matéria', 'materia'), col('Modalidade', 'modalidade'), col('Quórum', 'quorum'), col('SIM', 'sim'), col('NÃO', 'nao'), col('Abst.', 'abstencoes'), col('Não votaram', 'naoVotaram'), col('Resultado', 'resultado')],
    build: (d, f) => closedVotings(d, f).map((v) => votingRow(v, d)),
  },
  {
    id: 'votes-councilor',
    title: 'Votos por vereador',
    description: 'Votos nominais individuais. Votos secretos não são associados a vereadores.',
    icon: Landmark,
    group: 'Votações',
    filters: PROP_FILTERS,
    columns: [col('Vereador', 'vereador'), col('Matéria', 'materia'), col('Sessão', 'sessao'), col('Voto', 'voto'), col('Data/hora', 'data'), col('Identificador', 'codigo')],
    build: (d, f) => {
      const vots = new Map(closedVotings(d, { ...f, councilorId: '' }).filter((v) => v.method === 'nominal').map((v) => [v.id, v]))
      return d.votes
        .filter((v) => v.councilorId && vots.has(v.votingId) && (!f.councilorId || v.councilorId === f.councilorId))
        .sort((a, b) => b.castAt.localeCompare(a.castAt))
        .map((v) => {
          const p = d.propositions.find((x) => x.id === v.propositionId)
          return {
            vereador: d.lk.councilorName(v.councilorId),
            materia: p ? d.lk.code(p) : '—',
            sessao: sessionName(d.sessions.find((s) => s.id === v.sessionId)),
            voto: VoteChoiceMeta[v.choice].label,
            data: formatDateTimeShort(v.castAt),
            codigo: v.code,
          }
        })
    },
  },
  {
    id: 'abstentions',
    title: 'Abstenções',
    description: 'Abstenções registradas em votações nominais.',
    icon: MinusCircle,
    group: 'Votações',
    filters: PROP_FILTERS,
    columns: [col('Vereador', 'vereador'), col('Abstenções', 'abstencoes'), col('Votos nominais', 'votos'), col('Percentual', 'percentual'), col('Matérias', 'materias')],
    build: (d, f) => {
      const vots = new Set(closedVotings(d, { ...f, councilorId: '' }).filter((v) => v.method === 'nominal').map((v) => v.id))
      const votes = d.votes.filter((v) => v.councilorId && vots.has(v.votingId))
      return [...d.lk.councilors.values()]
        .filter((c) => !f.councilorId || c.id === f.councilorId)
        .map((c) => {
          const mine = votes.filter((v) => v.councilorId === c.id)
          const abst = mine.filter((v) => v.choice === 'abstention')
          return {
            vereador: c.parliamentaryName,
            abstencoes: abst.length,
            votos: mine.length,
            percentual: mine.length ? formatPercent(abst.length / mine.length) : '—',
            materias:
              abst
                .map((v) => {
                  const p = d.propositions.find((x) => x.id === v.propositionId)
                  return p ? d.lk.code(p) : ''
                })
                .join(', ') || '—',
          }
        })
        .filter((r) => r.votos > 0)
        .sort((a, b) => b.abstencoes - a.abstencoes)
    },
  },
]
