import type {
  AuthorType,
  DocumentRef,
  Opinion,
  OpinionConclusion,
  ProcessingRegime,
  ProcessMovement,
  ProcessStage,
  Proposition,
  PropositionStatus,
  VotingMethod,
} from '@/types'
import { processFlowSeed } from './organization'

interface Seed {
  id: string
  typeId: string
  number: number
  summary: string
  authorType: AuthorType
  authorId?: string
  authorName: string
  coauthorIds?: string[]
  presentedAt: string
  subject: string
  status: PropositionStatus
  stage: ProcessStage
  committeeIds?: string[]
  rapporteurId?: string
  regime?: ProcessingRegime
  votingMethod?: VotingMethod
  quorumRuleId?: string
  parentId?: string
  notes?: string
  body: string[]
}

const doc = (id: string, name: string, size: number, at: string, kind: DocumentRef['kind'] = 'attachment'): DocumentRef => ({
  id,
  name,
  size,
  mimeType: 'application/pdf',
  kind,
  uploadedAt: `${at}T10:00:00.000Z`,
  uploadedBy: 'Protocolo Geral',
})

const seeds: Seed[] = [
  {
    id: 'pp_pl025',
    typeId: 'pt_pl',
    number: 25,
    summary: 'Institui o Programa Municipal de Iluminação Pública Sustentável, com substituição gradual das luminárias por tecnologia LED, e dá outras providências.',
    authorType: 'executive',
    authorName: 'Poder Executivo — Prefeito Municipal',
    presentedAt: '2026-08-18',
    subject: 'Infraestrutura urbana; Eficiência energética',
    status: 'on_agenda',
    stage: 'order_of_day',
    committeeIds: ['cm_ccj', 'cm_cfo', 'cm_cosp'],
    rapporteurId: 'cv_05',
    body: [
      'Art. 1º Fica instituído o Programa Municipal de Iluminação Pública Sustentável, com o objetivo de modernizar o parque de iluminação pública do Município de Santa Aurora.',
      'Art. 2º O Programa compreende a substituição gradual das luminárias de vapor de sódio e mercúrio por luminárias com tecnologia LED, priorizando vias de maior circulação de pedestres, praças e entornos de escolas e unidades de saúde.',
      'Art. 3º O Poder Executivo publicará anualmente o cronograma de substituição, com indicação dos bairros e logradouros contemplados.',
      'Art. 4º A implantação deverá ser concluída no prazo de 24 (vinte e quatro) meses, contados da publicação desta Lei.',
      'Art. 5º As despesas decorrentes da execução desta Lei correrão por conta da Contribuição para o Custeio do Serviço de Iluminação Pública (COSIP).',
      'Art. 6º Esta Lei entra em vigor na data de sua publicação.',
    ],
  },
  {
    id: 'pp_pl026',
    typeId: 'pt_pl',
    number: 26,
    summary: 'Dispõe sobre a aquisição prioritária de gêneros alimentícios da agricultura familiar para a alimentação escolar da rede municipal de ensino.',
    authorType: 'councilor',
    authorId: 'cv_09',
    authorName: 'Marcos Teixeira',
    coauthorIds: ['cv_04'],
    presentedAt: '2026-08-25',
    subject: 'Educação; Agricultura familiar',
    status: 'on_agenda',
    stage: 'order_of_day',
    committeeIds: ['cm_ccj', 'cm_ess'],
    rapporteurId: 'cv_12',
    body: [
      'Art. 1º A alimentação escolar da rede municipal de ensino deverá priorizar a aquisição de gêneros alimentícios produzidos pela agricultura familiar local.',
      'Art. 2º No mínimo 40% (quarenta por cento) dos recursos destinados à alimentação escolar serão aplicados na aquisição de que trata o art. 1º.',
      'Art. 3º Esta Lei entra em vigor na data de sua publicação.',
    ],
  },
  {
    id: 'pp_req112',
    typeId: 'pt_req',
    number: 112,
    summary: 'Requer ao Poder Executivo informações sobre o cronograma de recapeamento asfáltico da Avenida Brasil e da Rua Coronel Firmino.',
    authorType: 'councilor',
    authorId: 'cv_05',
    authorName: 'Ricardo Alves',
    presentedAt: '2026-09-30',
    subject: 'Obras públicas',
    status: 'on_agenda',
    stage: 'order_of_day',
    votingMethod: 'symbolic',
    body: ['O Vereador que este subscreve requer, na forma regimental, que seja oficiado ao Poder Executivo solicitando o cronograma detalhado das obras de recapeamento asfáltico da Avenida Brasil e da Rua Coronel Firmino.'],
  },
  {
    id: 'pp_moc018',
    typeId: 'pt_moc',
    number: 18,
    summary: 'Moção de aplausos à equipe da Unidade Básica de Saúde do Bairro Esperança pelos 20 anos de serviços prestados à comunidade.',
    authorType: 'councilor',
    authorId: 'cv_04',
    authorName: 'Mariana Oliveira',
    coauthorIds: ['cv_12'],
    presentedAt: '2026-09-29',
    subject: 'Homenagem; Saúde',
    status: 'on_agenda',
    stage: 'order_of_day',
    votingMethod: 'symbolic',
    body: ['A Câmara Municipal de Santa Aurora manifesta seus aplausos aos profissionais da UBS Bairro Esperança pela dedicação ao longo de duas décadas de atendimento à população.'],
  },
  {
    id: 'pp_plc004',
    typeId: 'pt_plc',
    number: 4,
    summary: 'Altera dispositivos do Código Tributário Municipal relativos ao ISSQN incidente sobre microempreendedores individuais.',
    authorType: 'executive',
    authorName: 'Poder Executivo — Prefeito Municipal',
    presentedAt: '2026-09-08',
    subject: 'Tributação; Desenvolvimento econômico',
    status: 'in_committee',
    stage: 'opinion',
    committeeIds: ['cm_ccj', 'cm_cfo'],
    rapporteurId: 'cv_10',
    quorumRuleId: 'q_absolute',
    body: ['Art. 1º O art. 87 da Lei Complementar nº 12, de 2009 (Código Tributário Municipal), passa a vigorar com a seguinte redação: …', 'Art. 2º Esta Lei Complementar entra em vigor em 1º de janeiro do exercício seguinte ao de sua publicação.'],
  },
  {
    id: 'pp_pl024',
    typeId: 'pt_pl',
    number: 24,
    summary: 'Denomina Praça Professora Maria Aparecida Fonseca o logradouro público localizado no Bairro Jardim das Flores.',
    authorType: 'councilor',
    authorId: 'cv_11',
    authorName: 'Eduardo Nascimento',
    presentedAt: '2026-08-04',
    subject: 'Denominação de logradouro',
    status: 'approved',
    stage: 'sanction_veto',
    committeeIds: ['cm_ccj'],
    rapporteurId: 'cv_02',
    body: ['Art. 1º Fica denominada Praça Professora Maria Aparecida Fonseca a praça localizada entre as Ruas das Acácias e dos Girassóis, no Bairro Jardim das Flores.', 'Art. 2º Esta Lei entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_pl023',
    typeId: 'pt_pl',
    number: 23,
    summary: 'Institui a Semana Municipal de Conscientização sobre o Transtorno do Espectro Autista.',
    authorType: 'councilor',
    authorId: 'cv_12',
    authorName: 'Luciana Prado',
    coauthorIds: ['cv_08', 'cv_04'],
    presentedAt: '2026-07-14',
    subject: 'Saúde; Inclusão',
    status: 'sanctioned',
    stage: 'publication',
    committeeIds: ['cm_ccj', 'cm_ess'],
    rapporteurId: 'cv_04',
    body: ['Art. 1º Fica instituída a Semana Municipal de Conscientização sobre o Transtorno do Espectro Autista, a ser realizada anualmente na semana que compreender o dia 2 de abril.', 'Art. 2º Esta Lei entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_pl022',
    typeId: 'pt_pl',
    number: 22,
    summary: 'Dispõe sobre a obrigatoriedade de instalação de câmeras de monitoramento nas salas de aula das escolas municipais.',
    authorType: 'councilor',
    authorId: 'cv_03',
    authorName: 'Carlos Lima',
    presentedAt: '2026-07-07',
    subject: 'Educação; Segurança',
    status: 'rejected',
    stage: 'result',
    committeeIds: ['cm_ccj', 'cm_ess'],
    rapporteurId: 'cv_07',
    body: ['Art. 1º As salas de aula das escolas da rede municipal deverão contar com câmeras de monitoramento.', 'Art. 2º Esta Lei entra em vigor em 180 dias.'],
  },
  {
    id: 'pp_pr006',
    typeId: 'pt_pr',
    number: 6,
    summary: 'Altera o Regimento Interno da Câmara Municipal para disciplinar o uso do sistema eletrônico de votação e de registro de presença.',
    authorType: 'board',
    authorName: 'Mesa Diretora',
    presentedAt: '2026-09-01',
    subject: 'Regimento Interno; Modernização',
    status: 'in_committee',
    stage: 'committee',
    committeeIds: ['cm_cet'],
    rapporteurId: 'cv_02',
    quorumRuleId: 'q_absolute',
    body: ['Art. 1º O Regimento Interno passa a vigorar acrescido do Capítulo IV-A — Do Sistema Eletrônico de Votação.', 'Art. 2º Esta Resolução entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_pdl003',
    typeId: 'pt_pdl',
    number: 3,
    summary: 'Concede o Título de Cidadão Santa-Aurorense ao Senhor Antenor Vieira Bastos.',
    authorType: 'councilor',
    authorId: 'cv_01',
    authorName: 'João Martins',
    presentedAt: '2026-06-16',
    subject: 'Honraria',
    status: 'promulgated',
    stage: 'publication',
    committeeIds: ['cm_ccj'],
    rapporteurId: 'cv_07',
    quorumRuleId: 'q_two_thirds',
    body: ['Art. 1º Fica concedido o Título de Cidadão Santa-Aurorense ao Senhor Antenor Vieira Bastos, em reconhecimento aos relevantes serviços prestados ao Município.', 'Art. 2º Este Decreto Legislativo entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_ind087',
    typeId: 'pt_ind',
    number: 87,
    summary: 'Indica ao Poder Executivo a construção de abrigo no ponto de ônibus da Rua dos Ipês, Bairro Santa Luzia.',
    authorType: 'councilor',
    authorId: 'cv_08',
    authorName: 'Juliana Rocha',
    presentedAt: '2026-09-15',
    subject: 'Transporte coletivo',
    status: 'archived',
    stage: 'archiving',
    votingMethod: 'symbolic',
    body: ['Indica ao Excelentíssimo Senhor Prefeito a construção de abrigo no ponto de ônibus situado na Rua dos Ipês, em frente ao nº 340.'],
  },
  {
    id: 'pp_ind088',
    typeId: 'pt_ind',
    number: 88,
    summary: 'Indica a implantação de faixa elevada para travessia de pedestres em frente à Escola Municipal Cecília Meireles.',
    authorType: 'councilor',
    authorId: 'cv_06',
    authorName: 'Fernanda Costa',
    presentedAt: '2026-10-02',
    subject: 'Trânsito; Segurança escolar',
    status: 'filed',
    stage: 'protocol',
    votingMethod: 'symbolic',
    body: ['Indica ao Poder Executivo a implantação de faixa elevada para travessia de pedestres na Rua Monteiro Lobato, em frente à Escola Municipal Cecília Meireles.'],
  },
  {
    id: 'pp_pl027',
    typeId: 'pt_pl',
    number: 27,
    summary: 'Cria o Programa Bolsa Atleta Municipal destinado a atletas de alto rendimento residentes em Santa Aurora.',
    authorType: 'councilor',
    authorId: 'cv_11',
    authorName: 'Eduardo Nascimento',
    presentedAt: '2026-09-22',
    subject: 'Esporte; Juventude',
    status: 'in_analysis',
    stage: 'analysis',
    body: ['Art. 1º Fica criado o Programa Bolsa Atleta Municipal.', 'Art. 2º Esta Lei entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_pl028',
    typeId: 'pt_pl',
    number: 28,
    summary: 'Dispõe sobre a Política Municipal de Proteção e Bem-Estar Animal.',
    authorType: 'councilor',
    authorId: 'cv_02',
    authorName: 'Ana Carolina Souza',
    coauthorIds: ['cv_06'],
    presentedAt: '2026-09-23',
    subject: 'Meio ambiente; Bem-estar animal',
    status: 'in_committee',
    stage: 'opinion',
    committeeIds: ['cm_ccj', 'cm_cosp'],
    rapporteurId: 'cv_07',
    body: ['Art. 1º Fica instituída a Política Municipal de Proteção e Bem-Estar Animal.', 'Art. 2º Esta Lei entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_pl021',
    typeId: 'pt_pl',
    number: 21,
    summary: 'Autoriza o Poder Executivo a firmar convênio com o Consórcio Intermunicipal de Saúde do Sul de Minas.',
    authorType: 'executive',
    authorName: 'Poder Executivo — Prefeito Municipal',
    presentedAt: '2026-06-30',
    subject: 'Saúde; Convênios',
    status: 'vetoed',
    stage: 'sanction_veto',
    committeeIds: ['cm_ccj', 'cm_cfo'],
    rapporteurId: 'cv_10',
    body: ['Art. 1º Fica o Poder Executivo autorizado a firmar convênio com o Consórcio Intermunicipal de Saúde do Sul de Minas.', 'Art. 2º Esta Lei entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_vet002',
    typeId: 'pt_vet',
    number: 2,
    summary: 'Veto parcial aposto ao Projeto de Lei nº 021/2026, que autoriza convênio com o Consórcio Intermunicipal de Saúde do Sul de Minas.',
    authorType: 'executive',
    authorName: 'Poder Executivo — Prefeito Municipal',
    presentedAt: '2026-09-10',
    subject: 'Veto',
    status: 'in_committee',
    stage: 'opinion',
    committeeIds: ['cm_ccj'],
    rapporteurId: 'cv_07',
    parentId: 'pp_pl021',
    quorumRuleId: 'q_absolute',
    body: ['Comunico a Vossa Excelência que, nos termos da Lei Orgânica Municipal, decidi vetar parcialmente o Projeto de Lei nº 021/2026, especificamente o parágrafo único do art. 3º, pelas razões a seguir expostas.'],
  },
  {
    id: 'pp_eme001',
    typeId: 'pt_eme',
    number: 1,
    summary: 'Emenda modificativa ao art. 4º do Projeto de Lei nº 025/2026, ampliando para 36 meses o prazo de implantação do programa.',
    authorType: 'councilor',
    authorId: 'cv_03',
    authorName: 'Carlos Lima',
    presentedAt: '2026-09-14',
    subject: 'Emenda',
    status: 'ready_for_agenda',
    stage: 'agenda',
    committeeIds: ['cm_cosp'],
    rapporteurId: 'cv_05',
    parentId: 'pp_pl025',
    body: ['O art. 4º do Projeto de Lei nº 025/2026 passa a vigorar com a seguinte redação: "Art. 4º A implantação deverá ser concluída no prazo de 36 (trinta e seis) meses."'],
  },
  {
    id: 'pp_pl020',
    typeId: 'pt_pl',
    number: 20,
    summary: 'Institui o Plano Municipal de Arborização Urbana e estabelece diretrizes para o plantio e manejo de árvores em vias públicas.',
    authorType: 'councilor',
    authorId: 'cv_06',
    authorName: 'Fernanda Costa',
    presentedAt: '2026-05-19',
    subject: 'Meio ambiente; Urbanismo',
    status: 'sanctioned',
    stage: 'archiving',
    committeeIds: ['cm_ccj', 'cm_cosp'],
    rapporteurId: 'cv_11',
    body: ['Art. 1º Fica instituído o Plano Municipal de Arborização Urbana.', 'Art. 2º Esta Lei entra em vigor na data de sua publicação.'],
  },
  {
    id: 'pp_req110',
    typeId: 'pt_req',
    number: 110,
    summary: 'Requer a realização de audiência pública para debater a qualidade do transporte coletivo municipal.',
    authorType: 'councilor',
    authorId: 'cv_08',
    authorName: 'Juliana Rocha',
    presentedAt: '2026-09-16',
    subject: 'Transporte coletivo; Participação popular',
    status: 'approved',
    stage: 'result',
    votingMethod: 'symbolic',
    body: ['Requer, nos termos regimentais, a realização de audiência pública para debater a qualidade do serviço de transporte coletivo municipal.'],
  },
  {
    id: 'pp_req111',
    typeId: 'pt_req',
    number: 111,
    summary: 'Requer a convocação do Secretário Municipal de Saúde para prestar esclarecimentos sobre a fila de cirurgias eletivas.',
    authorType: 'councilor',
    authorId: 'cv_12',
    authorName: 'Luciana Prado',
    presentedAt: '2026-09-23',
    subject: 'Saúde; Fiscalização',
    status: 'approved',
    stage: 'result',
    votingMethod: 'nominal',
    quorumRuleId: 'q_absolute',
    body: ['Requer a convocação do Secretário Municipal de Saúde, nos termos da Lei Orgânica, para prestar esclarecimentos sobre a fila de cirurgias eletivas.'],
  },
  {
    id: 'pp_moc017',
    typeId: 'pt_moc',
    number: 17,
    summary: 'Moção de apelo pela manutenção da agência dos Correios do distrito de Vale Verde.',
    authorType: 'councilor',
    authorId: 'cv_09',
    authorName: 'Marcos Teixeira',
    presentedAt: '2026-09-21',
    subject: 'Serviços públicos',
    status: 'approved',
    stage: 'result',
    votingMethod: 'symbolic',
    body: ['A Câmara Municipal de Santa Aurora apela à direção regional dos Correios pela manutenção da agência do distrito de Vale Verde.'],
  },
  {
    id: 'pp_pl019',
    typeId: 'pt_pl',
    number: 19,
    summary: 'Dispõe sobre a criação do Conselho Municipal da Juventude.',
    authorType: 'councilor',
    authorId: 'cv_11',
    authorName: 'Eduardo Nascimento',
    presentedAt: '2026-04-14',
    subject: 'Juventude; Participação social',
    status: 'withdrawn',
    stage: 'archiving',
    committeeIds: ['cm_ccj'],
    notes: 'Retirado a pedido do autor para reapresentação com ajustes de iniciativa.',
    body: ['Art. 1º Fica criado o Conselho Municipal da Juventude.'],
  },
  {
    id: 'pp_pl029',
    typeId: 'pt_pl',
    number: 29,
    summary: 'Dispõe sobre a divulgação, na internet, das listas de espera para consultas, exames e cirurgias na rede municipal de saúde.',
    authorType: 'councilor',
    authorId: 'cv_12',
    authorName: 'Luciana Prado',
    presentedAt: '2026-08-11',
    subject: 'Saúde; Transparência',
    status: 'ready_for_agenda',
    stage: 'agenda',
    committeeIds: ['cm_ccj', 'cm_ess'],
    rapporteurId: 'cv_04',
    body: ['Art. 1º A Secretaria Municipal de Saúde divulgará, em seu sítio eletrônico, as listas de espera para consultas, exames e cirurgias.', 'Art. 2º Esta Lei entra em vigor em 90 dias.'],
  },
  {
    id: 'pp_pr007',
    typeId: 'pt_pr',
    number: 7,
    summary: 'Cria a Escola do Legislativo da Câmara Municipal de Santa Aurora.',
    authorType: 'board',
    authorName: 'Mesa Diretora',
    presentedAt: '2026-03-10',
    subject: 'Educação legislativa',
    status: 'ready_for_agenda',
    stage: 'agenda',
    committeeIds: ['cm_ccj'],
    rapporteurId: 'cv_02',
    body: ['Art. 1º Fica criada a Escola do Legislativo da Câmara Municipal de Santa Aurora.'],
  },
  {
    id: 'pp_pl018',
    typeId: 'pt_pl',
    number: 18,
    summary: 'Institui o Programa de Regularização Fundiária Urbana de Interesse Social no Município.',
    authorType: 'executive',
    authorName: 'Poder Executivo — Prefeito Municipal',
    presentedAt: '2026-02-10',
    subject: 'Habitação; Regularização fundiária',
    status: 'sanctioned',
    stage: 'archiving',
    committeeIds: ['cm_ccj', 'cm_cosp'],
    rapporteurId: 'cv_08',
    body: ['Art. 1º Fica instituído o Programa de Regularização Fundiária Urbana de Interesse Social.'],
  },
  {
    id: 'pp_pl017',
    typeId: 'pt_pl',
    number: 17,
    summary: 'Dispõe sobre a gratuidade do transporte coletivo para estudantes da rede pública em dias de provas de vestibular e ENEM.',
    authorType: 'councilor',
    authorId: 'cv_08',
    authorName: 'Juliana Rocha',
    presentedAt: '2026-01-20',
    subject: 'Educação; Transporte coletivo',
    status: 'rejected',
    stage: 'archiving',
    committeeIds: ['cm_ccj', 'cm_cfo'],
    rapporteurId: 'cv_10',
    body: ['Art. 1º Fica assegurada a gratuidade no transporte coletivo municipal a estudantes da rede pública nos dias de realização de exames vestibulares e do ENEM.'],
  },
]

const QUORUM_BY_TYPE: Record<string, string> = { pt_plc: 'q_absolute', pt_vet: 'q_absolute' }
const pad = (n: number) => String(n).padStart(3, '0')

export const propositionsSeed: Proposition[] = seeds.map((s) => ({
  id: s.id,
  typeId: s.typeId,
  number: s.number,
  year: 2026,
  summary: s.summary,
  authorType: s.authorType,
  authorId: s.authorId,
  authorName: s.authorName,
  coauthorIds: s.coauthorIds ?? [],
  presentedAt: s.presentedAt,
  subject: s.subject,
  fullText: s.body.join('\n\n'),
  attachments: [
    doc(`${s.id}_txt`, `${s.typeId.replace('pt_', '').toUpperCase()}-${pad(s.number)}-2026-texto-original.pdf`, 182_000 + s.number * 913, s.presentedAt, 'full_text'),
    ...(s.authorType === 'executive' ? [doc(`${s.id}_msg`, `Mensagem-do-Executivo-${pad(s.number)}-2026.pdf`, 96_400, s.presentedAt)] : []),
  ],
  status: s.status,
  stage: s.stage,
  committeeIds: s.committeeIds ?? [],
  rapporteurId: s.rapporteurId,
  regime: s.regime ?? (s.authorType === 'executive' ? 'priority' : 'ordinary'),
  votingMethod: s.votingMethod ?? 'nominal',
  quorumRuleId: s.quorumRuleId ?? QUORUM_BY_TYPE[s.typeId] ?? 'q_simple',
  notes: s.notes ?? '',
  parentId: s.parentId,
  protocolNumber: `${2026}${pad(s.number)}${s.typeId.length}`,
  createdAt: `${s.presentedAt}T09:00:00.000Z`,
  updatedAt: `${s.presentedAt}T09:00:00.000Z`,
}))

/* ---------- Movimentações (geradas a partir do fluxo configurado) ---------- */

const STAGE_ACTION: Partial<Record<ProcessStage, { action: string; from: string; to: string; who: string }>> = {
  protocol: { action: 'Protocolo e autuação', from: 'Autor', to: 'Protocolo Geral', who: 'Sérgio Antunes Moreira' },
  analysis: { action: 'Análise de admissibilidade', from: 'Protocolo Geral', to: 'Presidência', who: 'João Martins' },
  referral: { action: 'Despacho às comissões', from: 'Presidência', to: 'Secretaria Legislativa', who: 'João Martins' },
  committee: { action: 'Distribuição ao relator', from: 'Secretaria Legislativa', to: 'Comissões', who: 'Beatriz Lemos Arantes' },
  opinion: { action: 'Parecer emitido', from: 'Comissões', to: 'Secretaria Legislativa', who: 'Beatriz Lemos Arantes' },
  agenda: { action: 'Inclusão em pauta', from: 'Secretaria Legislativa', to: 'Plenário', who: 'Sérgio Antunes Moreira' },
  order_of_day: { action: 'Leitura na Ordem do Dia', from: 'Secretaria Legislativa', to: 'Plenário', who: 'João Martins' },
  discussion: { action: 'Discussão em Plenário', from: 'Plenário', to: 'Plenário', who: 'João Martins' },
  voting: { action: 'Votação em Plenário', from: 'Plenário', to: 'Presidência', who: 'João Martins' },
  result: { action: 'Proclamação do resultado', from: 'Plenário', to: 'Presidência', who: 'João Martins' },
  sanction_veto: { action: 'Remessa do autógrafo ao Executivo', from: 'Presidência', to: 'Poder Executivo', who: 'Sérgio Antunes Moreira' },
  promulgation: { action: 'Promulgação', from: 'Presidência', to: 'Secretaria Legislativa', who: 'João Martins' },
  publication: { action: 'Publicação no Diário Oficial', from: 'Secretaria Legislativa', to: 'Diário Oficial', who: 'Sérgio Antunes Moreira' },
  archiving: { action: 'Arquivamento', from: 'Secretaria Legislativa', to: 'Arquivo', who: 'Sérgio Antunes Moreira' },
}

const STAGE_NOTES: Partial<Record<ProcessStage, (p: Proposition) => string>> = {
  analysis: () => 'Matéria admitida. Atendidos os requisitos regimentais de forma e iniciativa.',
  referral: (p) => (p.committeeIds.length ? `Encaminhada às comissões: ${p.committeeIds.length} comissão(ões) competente(s).` : 'Dispensada a instrução por comissão.'),
  committee: () => 'Relator designado pelo Presidente da Comissão.',
  opinion: () => 'Parecer favorável aprovado na reunião da comissão.',
  agenda: () => 'Matéria apta para deliberação, incluída na pauta da sessão.',
  voting: () => 'Votação realizada pelo sistema eletrônico.',
  result: (p) => (['rejected', 'vetoed'].includes(p.status) && p.stage === 'result' ? 'Matéria rejeitada pelo Plenário.' : 'Matéria aprovada pelo Plenário.'),
  sanction_veto: (p) => (p.status === 'vetoed' ? 'Veto parcial comunicado pelo Executivo.' : 'Aguardando prazo de sanção.'),
}

const addHours = (iso: string, hours: number) => new Date(new Date(`${iso}T09:10:00-03:00`).getTime() + hours * 3_600_000).toISOString()

function movementsFor(p: Proposition): ProcessMovement[] {
  const flow = processFlowSeed.map((s) => s.key)
  const end = flow.indexOf(p.stage)
  const skipCommittee = p.committeeIds.length === 0
  const list: ProcessMovement[] = []
  let hours = 0
  for (let i = 1; i <= end; i++) {
    const stage = flow[i]
    if (skipCommittee && (stage === 'committee' || stage === 'opinion')) continue
    // Sanção/veto apenas para leis; promulgação pela Câmara apenas para decretos legislativos e resoluções.
    if (stage === 'sanction_veto' && !['pt_pl', 'pt_plc'].includes(p.typeId)) continue
    if (stage === 'promulgation' && !['pt_pdl', 'pt_pr'].includes(p.typeId)) continue
    const meta = STAGE_ACTION[stage]
    if (!meta) continue
    hours += stage === 'opinion' ? 7 * 24 : stage === 'agenda' ? 5 * 24 : stage === 'sanction_veto' ? 3 * 24 : 26 + (i % 3) * 3
    list.push({
      id: `mv_${p.id}_${stage}`,
      propositionId: p.id,
      at: addHours(p.presentedAt, hours),
      from: meta.from,
      to: meta.to,
      action: meta.action,
      stage,
      responsible: meta.who,
      notes: STAGE_NOTES[stage]?.(p) ?? '',
      documents: stage === 'opinion' ? [doc(`d_${p.id}_par`, `Parecer-${p.id.replace('pp_', '').toUpperCase()}.pdf`, 74_200, p.presentedAt, 'opinion')] : [],
    })
  }
  if (p.status === 'withdrawn') {
    list.push({
      id: `mv_${p.id}_withdrawn`,
      propositionId: p.id,
      at: addHours(p.presentedAt, hours + 48),
      from: 'Autor',
      to: 'Arquivo',
      action: 'Retirada pelo autor',
      stage: 'archiving',
      responsible: p.authorName,
      notes: p.notes,
      documents: [],
    })
  }
  return list
}

export const movementsSeed: ProcessMovement[] = propositionsSeed.flatMap(movementsFor)

/* ---------- Pareceres ---------- */

const PASSED_COMMITTEE: ProcessStage[] = ['agenda', 'order_of_day', 'discussion', 'voting', 'result', 'sanction_veto', 'promulgation', 'publication', 'archiving']

function opinionsFor(p: Proposition): Opinion[] {
  if (!p.committeeIds.length || p.status === 'withdrawn') return []
  const passed = PASSED_COMMITTEE.includes(p.stage)
  return p.committeeIds.map((committeeId, i) => {
    const contrary = p.id === 'pp_pl022' && committeeId === 'cm_ess'
    const conclusion: OpinionConclusion | null = passed ? (contrary ? 'contrary' : i === 1 && p.id === 'pp_pl025' ? 'favorable_with_reservations' : 'favorable') : null
    const status = passed ? 'completed' : p.stage === 'opinion' && i === 0 ? 'drafting' : 'pending'
    const issued = passed ? movementsSeed.find((m) => m.propositionId === p.id && m.stage === 'opinion')?.at.slice(0, 10) : undefined
    return {
      id: `op_${p.id}_${committeeId}`,
      propositionId: p.id,
      committeeId,
      rapporteurId: p.rapporteurId ?? 'cv_07',
      dueDate: addHours(p.presentedAt, 15 * 24).slice(0, 10),
      issuedAt: issued,
      report: passed || status === 'drafting' ? `Trata-se de proposição que ${p.summary.charAt(0).toLowerCase()}${p.summary.slice(1)} A matéria foi regularmente distribuída a esta Comissão para exame de mérito e admissibilidade.` : '',
      reasoning: passed
        ? contrary
          ? 'A proposição gera despesa continuada sem estimativa de impacto orçamentário e interfere na organização administrativa das unidades escolares, matéria de iniciativa privativa do Executivo.'
          : 'A proposição observa a competência legislativa municipal (art. 30, I, da Constituição Federal), não apresenta vícios de iniciativa e atende ao interesse público local.'
        : status === 'drafting'
          ? 'Em elaboração pelo relator.'
          : '',
      conclusion,
      status,
      attachments: passed ? [doc(`d_op_${p.id}_${committeeId}`, `Parecer-${committeeId.replace('cm_', '').toUpperCase()}-${p.id.replace('pp_', '').toUpperCase()}.pdf`, 68_000 + i * 1200, p.presentedAt, 'opinion')] : [],
      createdAt: `${p.presentedAt}T12:00:00.000Z`,
      updatedAt: `${p.presentedAt}T12:00:00.000Z`,
    }
  })
}

export const opinionsSeed: Opinion[] = propositionsSeed.flatMap(opinionsFor)
