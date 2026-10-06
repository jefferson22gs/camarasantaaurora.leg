import { dataSource } from '@/repositories'
import { createCrudService } from './crud'

/** Cadastros básicos — regras de exclusão protegem a integridade referencial. */

export const legislatureService = createCrudService('legislatures', {
  module: 'legislatures',
  entity: 'legislatura',
  label: (l) => l.name,
  beforeRemove: async (l) => {
    const linked = (await dataSource.collection('councilors').list()).filter((c) => c.legislatureId === l.id).length
    return linked ? `Existem ${linked} vereador(es) vinculado(s) a esta legislatura.` : null
  },
})

export const partyService = createCrudService('parties', {
  module: 'parties',
  entity: 'partido',
  label: (p) => `${p.acronym} — ${p.name}`,
  beforeRemove: async (p) => {
    const linked = (await dataSource.collection('councilors').list()).filter((c) => c.partyId === p.id).length
    return linked ? `Existem ${linked} vereador(es) filiado(s). Inative o partido em vez de excluí-lo.` : null
  },
})

export const councilorService = createCrudService('councilors', {
  module: 'councilors',
  entity: 'vereador',
  label: (c) => c.parliamentaryName,
  beforeRemove: async (c) => {
    const votes = (await dataSource.collection('votes').list()).some((v) => v.councilorId === c.id)
    return votes ? 'Vereador possui votos registrados. Altere a situação para "Inativo" para preservar o histórico.' : null
  },
})

export const committeeService = createCrudService('committees', {
  module: 'committees',
  entity: 'comissão',
  label: (c) => `${c.acronym} — ${c.name}`,
  beforeRemove: async (c) => {
    const linked = (await dataSource.collection('propositions').list()).filter((p) => p.committeeIds.includes(c.id)).length
    return linked ? `A comissão possui ${linked} matéria(s) vinculada(s). Encerre a comissão em vez de excluí-la.` : null
  },
})

export const userService = createCrudService('users', {
  module: 'users',
  entity: 'usuário',
  label: (u) => `${u.name} <${u.email}>`,
})

export const sessionService = createCrudService('sessions', {
  module: 'sessions',
  entity: 'sessão',
  label: (s) => `Sessão nº ${s.number}/${s.year}`,
  beforeRemove: async (s) => {
    if (s.status !== 'scheduled' && s.status !== 'cancelled') return 'Somente sessões agendadas ou canceladas podem ser excluídas.'
    const votings = (await dataSource.collection('votings').list()).some((v) => v.sessionId === s.id)
    return votings ? 'A sessão possui votações registradas.' : null
  },
})
