import type { CommitteeStatus } from '@/types'

export const COMMITTEE_STATUS_META: Record<CommitteeStatus, { label: string; tone: 'success' | 'neutral' }> = {
  active: { label: 'Em funcionamento', tone: 'success' },
  closed: { label: 'Encerrada', tone: 'neutral' },
}
