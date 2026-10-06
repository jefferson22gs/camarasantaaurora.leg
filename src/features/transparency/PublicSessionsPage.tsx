import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { Card, StatusBadge } from '@/components/ui/display'
import { NativeSelect } from '@/components/ui/form-controls'
import { Pagination, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection } from '@/hooks/useData'
import { SessionStatusMeta, SessionTypeLabel } from '@/domain/labels'
import { formatDateLong } from '@/lib/format'
import type { SessionType } from '@/types'
import { DateBlock, PUBLIC_BASE, PublicContainer, PublicPageHeader, sessionTitle } from './shared'

export default function PublicSessionsPage() {
  const query = useCollection('sessions')
  const [type, setType] = useState('')
  const [period, setPeriod] = useState<'all' | 'upcoming' | 'past'>('all')

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (query.data ?? [])
      .filter((s) => (!type || s.type === type) && (period === 'all' || (period === 'upcoming' ? s.date >= today && s.status !== 'closed' : s.date < today || s.status === 'closed')))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [query.data, type, period])
  const pagination = usePagination(filtered, 10)

  return (
    <PublicContainer>
      <PublicPageHeader title="Sessões plenárias" crumbs={[{ label: 'Sessões' }]} description="Calendário de sessões ordinárias, extraordinárias, solenes, especiais e audiências públicas." />

      <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Período">
          {(
            [
              ['all', 'Todas'],
              ['upcoming', 'Próximas'],
              ['past', 'Realizadas'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} aria-pressed={period === v} className={`rounded-md px-3 py-1.5 text-sm font-medium ${period === v ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          Tipo
          <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="w-52">
            <option value="">Todos</option>
            {(Object.keys(SessionTypeLabel) as SessionType[]).map((t) => (
              <option key={t} value={t}>
                {SessionTypeLabel[t]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </Card>

      <QueryState query={query}>
        {() =>
          filtered.length === 0 ? (
            <Card>
              <EmptyState icon={CalendarDays} title="Nenhuma sessão encontrada" />
            </Card>
          ) : (
            <>
              <ul className="space-y-3">
                {pagination.slice.map((s) => (
                  <li key={s.id}>
                    <Link to={`${PUBLIC_BASE}/sessoes/${s.id}`} className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30">
                      <DateBlock date={s.date} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{sessionTitle(s)}</span>
                          <StatusBadge meta={SessionStatusMeta[s.status]} />
                        </div>
                        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="capitalize">{formatDateLong(s.date)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" aria-hidden /> {s.startTime}
                            {s.endTime ? ` – ${s.endTime}` : ''}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden /> {s.location}
                          </span>
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Card className="mt-4">
                <Pagination {...pagination} />
              </Card>
            </>
          )
        }
      </QueryState>
    </PublicContainer>
  )
}
