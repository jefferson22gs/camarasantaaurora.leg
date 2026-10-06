import type { Organization, OrganizationSettings, ProcessStageConfig, PropositionTypeConfig, QuorumRule } from '@/types'

export const ORG_ID = 'org_santa_aurora'

export const organizationSeed: Organization = {
  id: ORG_ID,
  name: 'Câmara Municipal de Santa Aurora',
  shortName: 'Câmara de Santa Aurora',
  systemName: 'Sistema Legislativo',
  city: 'Santa Aurora',
  state: 'MG',
  cnpj: '18.452.736/0001-21',
  address: 'Praça da Matriz, 120 — Centro — CEP 37950-000',
  phone: '(35) 3521-4400',
  email: 'secretaria@camarasantaaurora.leg.br',
  website: 'https://www.camarasantaaurora.leg.br',
  primaryColor: '#1d3b63',
  secondaryColor: '#b8892b',
  councilSeats: 12,
  currentLegislatureId: 'leg_20',
  slug: 'santa-aurora',
}

export const quorumRulesSeed: QuorumRule[] = [
  { id: 'q_simple', name: 'Maioria simples', type: 'simple_majority', base: 'votes_cast', threshold: 'majority', abstentions: 'exclude', description: 'Mais da metade dos votos válidos (SIM e NÃO), presente a maioria absoluta.' },
  { id: 'q_absolute', name: 'Maioria absoluta', type: 'absolute_majority', base: 'members', threshold: 'majority', abstentions: 'exclude', description: 'Primeiro número inteiro superior à metade dos membros da Câmara.' },
  { id: 'q_qualified', name: 'Maioria qualificada (3/5)', type: 'qualified_majority', base: 'members', threshold: 'fraction', numerator: 3, denominator: 5, abstentions: 'exclude', description: 'Três quintos dos membros da Câmara.' },
  { id: 'q_two_thirds', name: 'Dois terços (2/3)', type: 'two_thirds', base: 'members', threshold: 'fraction', numerator: 2, denominator: 3, abstentions: 'exclude', description: 'Dois terços dos membros — emendas à Lei Orgânica, rejeição de parecer prévio, títulos honoríficos.' },
  { id: 'q_present', name: 'Maioria dos presentes', type: 'custom', base: 'present', threshold: 'majority', abstentions: 'include', description: 'Mais da metade dos vereadores presentes e aptos.' },
  { id: 'q_one_third', name: 'Um terço (1/3)', type: 'specific', base: 'members', threshold: 'fraction', numerator: 1, denominator: 3, abstentions: 'exclude', description: 'Um terço dos membros — requerimentos de CPI.' },
]

const type = (id: string, code: string, name: string, o: Partial<PropositionTypeConfig> = {}): PropositionTypeConfig => ({
  id,
  code,
  name,
  requiresCommittee: true,
  requiresVoting: true,
  defaultQuorumRuleId: 'q_simple',
  defaultVotingMethod: 'nominal',
  goesToSanction: false,
  active: true,
  ...o,
})

export const propositionTypesSeed: PropositionTypeConfig[] = [
  type('pt_pl', 'PL', 'Projeto de Lei', { goesToSanction: true }),
  type('pt_plc', 'PLC', 'Projeto de Lei Complementar', { goesToSanction: true, defaultQuorumRuleId: 'q_absolute' }),
  type('pt_pdl', 'PDL', 'Projeto de Decreto Legislativo'),
  type('pt_pr', 'PR', 'Projeto de Resolução'),
  type('pt_eme', 'EME', 'Emenda'),
  type('pt_sub', 'SUB', 'Substitutivo'),
  type('pt_req', 'REQ', 'Requerimento', { requiresCommittee: false, defaultVotingMethod: 'symbolic' }),
  type('pt_ind', 'IND', 'Indicação', { requiresCommittee: false, requiresVoting: false, defaultVotingMethod: 'symbolic' }),
  type('pt_moc', 'MOC', 'Moção', { requiresCommittee: false, defaultVotingMethod: 'symbolic' }),
  type('pt_par', 'PAR', 'Parecer', { requiresCommittee: false }),
  type('pt_vet', 'VET', 'Veto', { defaultQuorumRuleId: 'q_absolute' }),
  type('pt_out', 'OUT', 'Outros', { requiresCommittee: false, requiresVoting: false }),
]

export const processFlowSeed: ProcessStageConfig[] = [
  { key: 'proposition', label: 'Proposição', description: 'Apresentação da matéria pelo autor.', enabled: true, unit: 'Autor' },
  { key: 'protocol', label: 'Protocolo', description: 'Registro, numeração e autuação.', enabled: true, unit: 'Protocolo Geral' },
  { key: 'analysis', label: 'Análise', description: 'Análise de admissibilidade pela Presidência/Secretaria.', enabled: true, unit: 'Presidência' },
  { key: 'referral', label: 'Encaminhamento', description: 'Despacho às comissões competentes.', enabled: true, unit: 'Secretaria Legislativa' },
  { key: 'committee', label: 'Comissão', description: 'Instrução e distribuição ao relator.', enabled: true, unit: 'Comissões' },
  { key: 'opinion', label: 'Parecer', description: 'Emissão de parecer pelo relator e votação na comissão.', enabled: true, unit: 'Comissões' },
  { key: 'agenda', label: 'Pauta', description: 'Inclusão em pauta de sessão plenária.', enabled: true, unit: 'Secretaria Legislativa' },
  { key: 'order_of_day', label: 'Ordem do Dia', description: 'Apreciação em Plenário.', enabled: true, unit: 'Plenário' },
  { key: 'discussion', label: 'Discussão', description: 'Discussão da matéria em Plenário.', enabled: true, unit: 'Plenário' },
  { key: 'voting', label: 'Votação', description: 'Votação eletrônica em Plenário.', enabled: true, unit: 'Plenário' },
  { key: 'result', label: 'Resultado', description: 'Apuração e proclamação do resultado.', enabled: true, unit: 'Presidência' },
  { key: 'sanction_veto', label: 'Sanção/Veto', description: 'Envio do autógrafo ao Executivo.', enabled: true, unit: 'Poder Executivo' },
  { key: 'promulgation', label: 'Promulgação', description: 'Promulgação da norma.', enabled: true, unit: 'Presidência' },
  { key: 'publication', label: 'Publicação', description: 'Publicação no Diário Oficial e Portal.', enabled: true, unit: 'Secretaria Legislativa' },
  { key: 'archiving', label: 'Arquivamento', description: 'Arquivamento do processo.', enabled: true, unit: 'Arquivo' },
]

export const settingsSeed: OrganizationSettings = {
  organizationId: ORG_ID,
  voting: {
    defaultDurationSeconds: 120,
    automaticClose: false,
    allowAbstention: true,
    labels: { yes: 'SIM', no: 'NÃO', abstention: 'ABSTENÇÃO' },
    deliberationQuorum: 'absolute_majority',
    withoutQuorumBehavior: 'block',
    allowReopen: true,
    tieOutcome: 'rejected',
  },
  presidentRule: {
    mode: 'specific',
    votesOnQuorumTypes: ['absolute_majority', 'qualified_majority', 'two_thirds'],
    votesOnSecret: true,
    tiebreak: true,
  },
  quorumRules: quorumRulesSeed,
  propositionTypes: propositionTypesSeed,
  processFlow: processFlowSeed,
  transparency: { publishNominalVotes: true, publishAttendance: true, publishOpinions: true, publishMinutes: true },
  notifications: { channels: { system: true, email: false, app: false, whatsapp: false } },
  security: { sessionTimeoutMinutes: 60, requireDeviceRegistration: true, passwordMinLength: 10 },
  documents: {
    minutesHeader: 'ESTADO DE MINAS GERAIS — CÂMARA MUNICIPAL DE SANTA AURORA',
    minutesFooter: 'Nada mais havendo a tratar, o Presidente declarou encerrada a sessão, da qual se lavrou a presente ata.',
    agendaHeader: 'PAUTA DA SESSÃO',
  },
  sessionDefaults: { location: 'Plenário Vereador Antônio Prado', startTime: '19:00', durationMinutes: 180 },
  integrations: { portalUrl: 'https://www.camarasantaaurora.leg.br', webhookUrl: '' },
}
