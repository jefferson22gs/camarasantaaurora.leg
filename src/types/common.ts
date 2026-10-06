export type ID = string
/** Data ISO (yyyy-MM-dd) */
export type ISODate = string
/** Data/hora ISO 8601 */
export type ISODateTime = string

export interface Entity {
  id: ID
}

export interface Timestamped {
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface DocumentRef {
  id: ID
  name: string
  size: number
  mimeType: string
  kind: 'full_text' | 'attachment' | 'opinion' | 'minutes' | 'impediment' | 'other'
  uploadedAt: ISODateTime
  uploadedBy: string
  /** Fase 1: armazenamento simulado (somente metadados). Fase 2: caminho no Supabase Storage. */
  storagePath?: string
}
/** Alias exigido pela especificação (evita conflito com o global DOM `Document`). */
export type LegislativeDocument = DocumentRef
