import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type DateLike = string | number | Date | null | undefined

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = typeof value === 'string' ? parseISO(value) : new Date(value)
  return isValid(d) ? d : null
}

const fmt = (pattern: string) => (value: DateLike) => {
  const d = toDate(value)
  return d ? format(d, pattern, { locale: ptBR }) : '—'
}

/** dd/MM/yyyy */
export const formatDate = fmt('dd/MM/yyyy')
/** HH:mm */
export const formatTime = fmt('HH:mm')
/** dd/MM/yyyy HH:mm:ss */
export const formatDateTime = fmt('dd/MM/yyyy HH:mm:ss')
/** dd/MM/yyyy HH:mm */
export const formatDateTimeShort = fmt('dd/MM/yyyy HH:mm')
/** segunda-feira, 06 de outubro de 2026 */
export const formatDateLong = fmt("EEEE, dd 'de' MMMM 'de' yyyy")
export const formatMonthYear = fmt('MMM/yy')

export function formatRelative(value: DateLike) {
  const d = toDate(value)
  return d ? formatDistanceToNow(d, { locale: ptBR, addSuffix: true }) : '—'
}

const numberFmt = new Intl.NumberFormat('pt-BR')
export const formatNumber = (n: number) => numberFmt.format(n)

export function formatPercent(value: number, digits = 0) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: digits }).format(value)
}

/** 125 segundos → "02:05" */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const padNumber = (n: number, size = 3) => String(n).padStart(size, '0')

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`
  return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} MB`
}

export function formatCPF(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) => `${a}.${b}.${c}${e ? `-${e}` : ''}`)
}

export function formatPhone(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

/** Hora local atual em ISO (sem depender de servidor nesta fase). */
export const nowISO = () => new Date().toISOString()
export const todayISO = () => format(new Date(), 'yyyy-MM-dd')
