import type { Entity, ID } from '@/types'
import { storageService } from '@/services/storage'
import { collectionSeeds, documentSeeds, SEED_VERSION, VOTE_SEQUENCE_START } from '@/mocks'
import type { CollectionMap, CollectionName, CollectionRepository, DataSource, DocumentMap, DocumentName, DocumentRepository } from '../types'

/** Latência simulada para exercitar estados de loading. */
const LATENCY_MS = 120
const wait = () => new Promise<void>((r) => setTimeout(r, LATENCY_MS))
const clone = <T>(v: T): T => structuredClone(v)
const DB = (name: string) => `db:${name}`

function ensureSeedVersion() {
  if (storageService.get<number>('db:version', 0) === SEED_VERSION) return
  storageService.clear((k) => k.startsWith('db:') || k.startsWith('seq:'))
  storageService.set('db:version', SEED_VERSION)
}

class LocalCollectionRepository<T extends Entity> implements CollectionRepository<T> {
  constructor(
    private readonly name: string,
    private readonly seed: T[],
  ) {}

  private read(): T[] {
    return storageService.get<T[] | null>(DB(this.name), null) ?? clone(this.seed)
  }

  private write(items: T[]) {
    storageService.set(DB(this.name), items)
  }

  async list() {
    await wait()
    return this.read()
  }

  async get(id: ID) {
    await wait()
    return this.read().find((i) => i.id === id) ?? null
  }

  async create(item: T) {
    const items = this.read()
    if (items.some((i) => i.id === item.id)) throw new Error('Registro já existente.')
    this.write([...items, item])
    return item
  }

  async update(id: ID, patch: Partial<T>) {
    const items = this.read()
    const index = items.findIndex((i) => i.id === id)
    if (index < 0) throw new Error('Registro não encontrado.')
    const updated = { ...items[index], ...patch, id }
    items[index] = updated
    this.write(items)
    return updated
  }

  async remove(id: ID) {
    this.write(this.read().filter((i) => i.id !== id))
  }

  async upsertMany(list: T[]) {
    const map = new Map(this.read().map((i) => [i.id, i]))
    for (const item of list) map.set(item.id, item)
    this.write([...map.values()])
  }
}

class LocalDocumentRepository<T> implements DocumentRepository<T> {
  constructor(
    private readonly name: string,
    private readonly seed: T,
  ) {}

  async get() {
    await wait()
    return storageService.get<T | null>(DB(this.name), null) ?? clone(this.seed)
  }

  async save(value: T) {
    storageService.set(DB(this.name), value)
    return value
  }
}

export function createLocalDataSource(): DataSource {
  ensureSeedVersion()
  const collections = new Map<string, unknown>()
  const documents = new Map<string, unknown>()

  return {
    collection<K extends CollectionName>(name: K) {
      if (!collections.has(name)) collections.set(name, new LocalCollectionRepository(name, collectionSeeds[name] as CollectionMap[K][]))
      return collections.get(name) as CollectionRepository<CollectionMap[K]>
    },
    document<K extends DocumentName>(name: K) {
      if (!documents.has(name)) documents.set(name, new LocalDocumentRepository(name, documentSeeds[name] as DocumentMap[K]))
      return documents.get(name) as DocumentRepository<DocumentMap[K]>
    },
    async reset() {
      storageService.clear((k) => k.startsWith('db:') || k.startsWith('seq:'))
      storageService.set('db:version', SEED_VERSION)
    },
    async nextSequence(name: string) {
      return storageService.nextSequence(name, name === 'vote' ? VOTE_SEQUENCE_START : 0)
    },
  }
}
