/**
 * Único ponto de acesso a localStorage/sessionStorage.
 * Componentes NUNCA acessam o storage diretamente.
 * Na fase Supabase, apenas preferências locais (tema, sidebar) continuarão aqui.
 */
const PREFIX = 'spl:'
type Scope = 'local' | 'session'

const area = (scope: Scope): Storage | null => {
  try {
    return scope === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const storageService = {
  get<T>(key: string, fallback: T, scope: Scope = 'local'): T {
    try {
      const raw = area(scope)?.getItem(PREFIX + key)
      return raw === null || raw === undefined ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T, scope: Scope = 'local') {
    try {
      const store = area(scope)
      if (!store) throw new Error('Armazenamento indisponível.')
      store.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      throw new Error('Não foi possível salvar os dados no navegador. Verifique o espaço disponível e as permissões de armazenamento.')
    }
  },
  remove(key: string, scope: Scope = 'local') {
    area(scope)?.removeItem(PREFIX + key)
  },
  /** Remove todos os dados do sistema (usado para restaurar a demonstração). */
  clear(predicate: (key: string) => boolean = () => true) {
    const store = area('local')
    if (!store) return
    Object.keys(store)
      .filter((k) => k.startsWith(PREFIX) && predicate(k.slice(PREFIX.length)))
      .forEach((k) => store.removeItem(k))
  },
  /** Próximo valor de uma sequência numérica persistida. */
  nextSequence(name: string, start = 0) {
    const next = this.get<number>(`seq:${name}`, start) + 1
    this.set(`seq:${name}`, next)
    return next
  },
}
