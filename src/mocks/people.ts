import type { BoardRole, Committee, Councilor, Legislature, Party, User } from '@/types'

export const legislaturesSeed: Legislature[] = [
  { id: 'leg_19', name: '19ª Legislatura', number: 19, startDate: '2021-01-01', endDate: '2024-12-31', status: 'closed', notes: 'Legislatura encerrada. Acervo disponível para consulta.' },
  { id: 'leg_20', name: '20ª Legislatura', number: 20, startDate: '2025-01-01', endDate: '2028-12-31', status: 'active', notes: 'Legislatura em curso, composta por 12 vereadores.' },
  { id: 'leg_21', name: '21ª Legislatura', number: 21, startDate: '2029-01-01', endDate: '2032-12-31', status: 'future', notes: 'Cadastrada para planejamento.' },
]

/** Partidos fictícios — não representam agremiações reais. */
export const partiesSeed: Party[] = [
  { id: 'pty_unm', acronym: 'UNM', name: 'União Municipalista', number: 31, color: '#1d4ed8', status: 'active' },
  { id: 'pty_fpr', acronym: 'FPR', name: 'Frente Popular Renovadora', number: 47, color: '#b91c1c', status: 'active' },
  { id: 'pty_alc', acronym: 'ALC', name: 'Aliança Cidadã', number: 52, color: '#0f766e', status: 'active' },
  { id: 'pty_moc', acronym: 'MOC', name: 'Movimento Comunitário', number: 61, color: '#c2410c', status: 'active' },
  { id: 'pty_rdi', acronym: 'RDI', name: 'Rede de Desenvolvimento Integrado', number: 74, color: '#7c3aed', status: 'active' },
  { id: 'pty_pma', acronym: 'PMA', name: 'Partido Municipal Agrário', number: 83, color: '#4d7c0f', status: 'inactive' },
]

const c = (
  id: string,
  fullName: string,
  parliamentaryName: string,
  partyId: string,
  boardRole: BoardRole | null,
  phone: string,
  bio: string,
): Councilor => ({
  id,
  fullName,
  parliamentaryName,
  partyId,
  legislatureId: 'leg_20',
  mandate: 'holder',
  mandateStart: '2025-01-01',
  mandateEnd: '2028-12-31',
  email: `${parliamentaryName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')}@camarasantaaurora.leg.br`,
  phone,
  status: 'active',
  boardRole,
  bio,
})

export const councilorsSeed: Councilor[] = [
  c('cv_01', 'João Batista Martins', 'João Martins', 'pty_unm', 'president', '(35) 99812-4410', 'Professor da rede estadual, terceiro mandato. Presidente da Câmara no biênio 2025–2026.'),
  c('cv_02', 'Ana Carolina de Souza', 'Ana Carolina Souza', 'pty_alc', 'vice_president', '(35) 99744-1023', 'Advogada, atuação em direitos da criança e do adolescente.'),
  c('cv_03', 'Carlos Henrique Lima', 'Carlos Lima', 'pty_fpr', 'first_secretary', '(35) 99655-7821', 'Comerciante, ex-presidente da Associação Comercial de Santa Aurora.'),
  c('cv_04', 'Mariana Oliveira Campos', 'Mariana Oliveira', 'pty_moc', 'second_secretary', '(35) 99901-3345', 'Enfermeira, coordenou a Unidade Básica de Saúde do Bairro Esperança.'),
  c('cv_05', 'Ricardo Alves Pereira', 'Ricardo Alves', 'pty_unm', null, '(35) 99877-2290', 'Engenheiro civil, foco em infraestrutura urbana e mobilidade.'),
  c('cv_06', 'Fernanda Costa Mello', 'Fernanda Costa', 'pty_rdi', null, '(35) 99623-5512', 'Empresária do setor de turismo rural.'),
  c('cv_07', 'Paulo Roberto Mendes', 'Paulo Mendes', 'pty_fpr', null, '(35) 99734-8801', 'Servidor público aposentado, presidente da Comissão de Constituição e Justiça.'),
  c('cv_08', 'Juliana Ferreira Rocha', 'Juliana Rocha', 'pty_alc', null, '(35) 99511-6634', 'Assistente social, atuação em políticas de assistência e habitação.'),
  c('cv_09', 'Marcos Vinícius Teixeira', 'Marcos Teixeira', 'pty_moc', null, '(35) 99488-1207', 'Produtor rural, representante da comunidade do distrito de Vale Verde.'),
  c('cv_10', 'Patrícia Gomes Barbosa', 'Patrícia Barbosa', 'pty_rdi', null, '(35) 99366-4478', 'Contadora, presidente da Comissão de Finanças e Orçamento.'),
  c('cv_11', 'Eduardo Nascimento Silva', 'Eduardo Nascimento', 'pty_unm', null, '(35) 99210-9953', 'Educador físico, atuação em esporte e juventude.'),
  c('cv_12', 'Luciana Ribeiro Prado', 'Luciana Prado', 'pty_alc', null, '(35) 99157-3386', 'Médica pediatra, defensora da atenção primária à saúde.'),
  {
    ...c('cv_13', 'Roberto Cardoso Neves', 'Roberto Cardoso', 'pty_alc', null, '(35) 99044-2219', 'Primeiro suplente da Aliança Cidadã.'),
    mandate: 'substitute',
    status: 'inactive',
  },
]

export const committeesSeed: Committee[] = [
  {
    id: 'cm_ccj',
    name: 'Comissão de Constituição, Justiça e Redação',
    acronym: 'CCJR',
    kind: 'permanent',
    startDate: '2025-02-01',
    presidentId: 'cv_07',
    vicePresidentId: 'cv_02',
    memberIds: ['cv_07', 'cv_02', 'cv_05'],
    description: 'Opina sobre aspectos constitucionais, legais, jurídicos, regimentais e de técnica legislativa das proposições.',
    status: 'active',
  },
  {
    id: 'cm_cfo',
    name: 'Comissão de Finanças, Orçamento e Tributação',
    acronym: 'CFOT',
    kind: 'permanent',
    startDate: '2025-02-01',
    presidentId: 'cv_10',
    vicePresidentId: 'cv_03',
    memberIds: ['cv_10', 'cv_03', 'cv_09'],
    description: 'Opina sobre matérias financeiras, orçamentárias e tributárias, incluindo PPA, LDO e LOA.',
    status: 'active',
  },
  {
    id: 'cm_cosp',
    name: 'Comissão de Obras, Serviços Públicos e Meio Ambiente',
    acronym: 'COSPMA',
    kind: 'permanent',
    startDate: '2025-02-01',
    presidentId: 'cv_05',
    vicePresidentId: 'cv_06',
    memberIds: ['cv_05', 'cv_06', 'cv_11'],
    description: 'Opina sobre obras, urbanismo, transporte, serviços públicos e meio ambiente.',
    status: 'active',
  },
  {
    id: 'cm_ess',
    name: 'Comissão de Educação, Saúde e Assistência Social',
    acronym: 'CESAS',
    kind: 'permanent',
    startDate: '2025-02-01',
    presidentId: 'cv_04',
    vicePresidentId: 'cv_12',
    memberIds: ['cv_04', 'cv_12', 'cv_08'],
    description: 'Opina sobre educação, cultura, saúde, assistência social e direitos humanos.',
    status: 'active',
  },
  {
    id: 'cm_cet',
    name: 'Comissão Especial de Revisão do Regimento Interno',
    acronym: 'CERRI',
    kind: 'temporary',
    startDate: '2026-03-02',
    endDate: '2026-12-15',
    presidentId: 'cv_02',
    vicePresidentId: 'cv_07',
    memberIds: ['cv_02', 'cv_07', 'cv_03', 'cv_08', 'cv_10'],
    description: 'Comissão temporária para revisão e consolidação do Regimento Interno.',
    status: 'active',
  },
]

export const usersSeed: User[] = [
  { id: 'usr_admin', name: 'Helena Duarte Vasconcelos', email: 'helena.duarte@camarasantaaurora.leg.br', role: 'admin', active: true, createdAt: '2025-01-02T09:00:00.000Z', lastAccessAt: '2026-10-06T11:12:00.000Z' },
  { id: 'usr_pres', name: 'João Martins', email: 'joao.martins@camarasantaaurora.leg.br', role: 'presidency', councilorId: 'cv_01', active: true, createdAt: '2025-01-02T09:00:00.000Z', lastAccessAt: '2026-10-05T21:40:00.000Z' },
  { id: 'usr_sec', name: 'Sérgio Antunes Moreira', email: 'sergio.antunes@camarasantaaurora.leg.br', role: 'secretariat', active: true, createdAt: '2025-01-02T09:00:00.000Z', lastAccessAt: '2026-10-06T10:02:00.000Z' },
  { id: 'usr_com', name: 'Beatriz Lemos Arantes', email: 'beatriz.lemos@camarasantaaurora.leg.br', role: 'committee', committeeId: 'cm_ccj', active: true, createdAt: '2025-02-03T09:00:00.000Z', lastAccessAt: '2026-10-03T16:20:00.000Z' },
  { id: 'usr_sec2', name: 'Rafael Quintana Dias', email: 'rafael.quintana@camarasantaaurora.leg.br', role: 'secretariat', active: false, createdAt: '2025-01-02T09:00:00.000Z' },
  ...councilorsSeed
    .filter((cv) => cv.status === 'active')
    .map<User>((cv) => ({
      id: `usr_${cv.id}`,
      name: cv.parliamentaryName,
      email: cv.email,
      role: 'councilor',
      councilorId: cv.id,
      active: true,
      createdAt: '2025-01-02T09:00:00.000Z',
    })),
]
