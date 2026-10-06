import type { Entity, ID, PermissionModule } from '@/types'
import { dataSource, type CollectionMap, type CollectionName } from '@/repositories'
import { audit, broadcast } from './activity'

interface CrudOptions<T> {
  module: PermissionModule
  /** Nome legível da entidade para auditoria ("vereador", "partido"). */
  entity: string
  label: (item: T) => string
  /** Validação de regra de negócio antes de excluir (ex.: partido com vereadores vinculados). */
  beforeRemove?: (item: T) => Promise<string | null>
}

/**
 * Service genérico de cadastros simples: persistência + auditoria + evento realtime.
 * Regras específicas ficam nos services de cada domínio.
 */
export function createCrudService<K extends CollectionName>(name: K, options: CrudOptions<CollectionMap[K]>) {
  type T = CollectionMap[K]
  const repo = () => dataSource.collection(name)
  const changed = () => broadcast({ type: 'DATA_CHANGED', collections: [name] })

  return {
    list: () => repo().list(),
    get: (id: ID) => repo().get(id),
    async create(item: T) {
      const created = await repo().create(item)
      await audit({ operation: `Cadastro de ${options.entity}`, module: options.module, recordId: item.id, recordLabel: options.label(created), details: 'Registro criado', after: options.label(created) })
      changed()
      return created
    },
    async update(id: ID, patch: Partial<T>) {
      const before = await repo().get(id)
      const updated = await repo().update(id, patch)
      await audit({
        operation: `Alteração de ${options.entity}`,
        module: options.module,
        recordId: id,
        recordLabel: options.label(updated),
        details: `Campos alterados: ${Object.keys(patch).join(', ')}`,
        before: before ? summarize(before, patch) : undefined,
        after: summarize(updated, patch),
      })
      changed()
      return updated
    },
    async remove(id: ID) {
      const item = await repo().get(id)
      if (!item) return
      const blocker = await options.beforeRemove?.(item)
      if (blocker) throw new Error(blocker)
      await repo().remove(id)
      await audit({ operation: `Exclusão de ${options.entity}`, module: options.module, recordId: id, recordLabel: options.label(item), details: 'Registro excluído', before: options.label(item) })
      changed()
    },
  }
}

function summarize<T extends Entity>(item: T, patch: Partial<T>) {
  return Object.keys(patch)
    .map((k) => `${k}: ${formatValue((item as Record<string, unknown>)[k])}`)
    .join(' · ')
    .slice(0, 400)
}

function formatValue(v: unknown) {
  if (Array.isArray(v)) return `[${v.length}]`
  if (v && typeof v === 'object') return '{…}'
  return String(v ?? '—')
}
