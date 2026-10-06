import type { Organization, OrganizationSettings, PermissionMatrix } from '@/types'
import { dataSource } from '@/repositories'
import { audit, broadcast } from './activity'

export const settingsService = {
  getOrganization: () => dataSource.document('organization').get(),
  getSettings: () => dataSource.document('settings').get(),
  getPermissions: () => dataSource.document('permissions').get(),

  async saveOrganization(org: Organization) {
    await dataSource.document('organization').save(org)
    await audit({ operation: 'Alteração de configuração', module: 'settings', recordId: org.id, recordLabel: 'Câmara / Identidade visual', details: `Dados institucionais de ${org.name}` })
    broadcast({ type: 'DATA_CHANGED', collections: ['organization'] })
    return org
  },

  async saveSettings(settings: OrganizationSettings, section: string) {
    await dataSource.document('settings').save(settings)
    await audit({ operation: 'Alteração de configuração', module: 'settings', recordLabel: section, details: `Seção "${section}" atualizada` })
    broadcast({ type: 'DATA_CHANGED', collections: ['settings'] })
    return settings
  },

  async savePermissions(matrix: PermissionMatrix) {
    await dataSource.document('permissions').save(matrix)
    await audit({ operation: 'Alteração de permissões', module: 'permissions', recordLabel: 'Matriz de permissões', details: 'Permissões de perfis atualizadas' })
    broadcast({ type: 'DATA_CHANGED', collections: ['permissions'] })
    return matrix
  },

  /** Restaura o dataset de demonstração completo. */
  async resetDemo() {
    await dataSource.reset()
    broadcast({
      type: 'DATA_CHANGED',
      collections: ['organization', 'settings', 'permissions', 'legislatures', 'parties', 'councilors', 'committees', 'users', 'propositions', 'movements', 'opinions', 'sessions', 'attendance', 'agendas', 'impediments', 'votings', 'votes', 'notifications', 'auditLogs'],
    })
  },
}
