import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Busca textual tolerante a acentos e caixa. */
export function matches(haystack: Array<string | number | undefined | null>, query: string) {
  const q = normalize(query.trim())
  if (!q) return true
  const text = normalize(haystack.filter((v) => v !== undefined && v !== null).join(' '))
  return q.split(/\s+/).every((term) => text.includes(term))
}

export function groupCount<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>()
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1)
  return map
}
