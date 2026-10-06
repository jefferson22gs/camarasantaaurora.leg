import { createLocalDataSource } from './local/localDataSource'
import type { DataSource } from './types'

export type * from './types'

/**
 * Ponto único de troca da camada de persistência.
 * Fase 2: `import.meta.env.VITE_DATA_SOURCE === 'supabase' ? createSupabaseDataSource() : createLocalDataSource()`
 */
export const dataSource: DataSource = createLocalDataSource()
