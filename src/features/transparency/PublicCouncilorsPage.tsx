import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { Avatar, Badge, Card } from '@/components/ui/display'
import { NativeSelect } from '@/components/ui/form-controls'
import { SearchInput } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection, useLookups, useOrganization, useSettings } from '@/hooks/useData'
import { BoardRoleLabel } from '@/domain/labels'
import { formatPercent } from '@/lib/format'
import { matches } from '@/lib/utils'
import { attendanceRate, PUBLIC_BASE, PublicContainer, PublicPageHeader } from './shared'

export default function PublicCouncilorsPage() {
  const councilors = useCollection('councilors')
  const attendance = useCollection('attendance')
  const { data: org } = useOrganization()
  const { data: settings } = useSettings()
  const lk = useLookups()
  const [q, setQ] = useState('')
  const [party, setParty] = useState('')

  const list = useMemo(
    () =>
      (councilors.data ?? [])
        .filter((c) => c.status === 'active' && (!org || c.legislatureId === org.currentLegislatureId))
        .filter((c) => (!party || c.partyId === party) && matches([c.parliamentaryName, c.fullName, lk.parties.get(c.partyId)?.acronym], q))
        .sort((a, b) => (a.boardRole ? 0 : 1) - (b.boardRole ? 0 : 1) || a.parliamentaryName.localeCompare(b.parliamentaryName, 'pt-BR')),
    [councilors.data, org, party, q, lk],
  )
  const showAttendance = settings?.transparency.publishAttendance ?? true

  return (
    <PublicContainer>
      <PublicPageHeader title="Vereadores" crumbs={[{ label: 'Vereadores' }]} description="Composição da legislatura em curso, Mesa Diretora e presença em sessões." />
      <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <SearchInput value={q} onChange={setQ} placeholder="Nome do vereador…" />
        <label className="grid gap-1.5 text-sm font-medium">
          Partido
          <NativeSelect value={party} onChange={(e) => setParty(e.target.value)} className="w-56">
            <option value="">Todos</option>
            {[...lk.parties.values()].map((p) => (
              <option key={p.id} value={p.id}>
                {p.acronym} — {p.name}
              </option>
            ))}
          </NativeSelect>
        </label>
      </Card>

      <QueryState query={councilors} isEmpty={() => list.length === 0} empty={<Card><EmptyState icon={Landmark} title="Nenhum vereador encontrado" /></Card>}>
        {() => (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((c) => {
              const p = lk.parties.get(c.partyId)
              const rate = attendanceRate((attendance.data ?? []).filter((a) => a.councilorId === c.id))
              return (
                <li key={c.id}>
                  <Link to={`${PUBLIC_BASE}/vereadores/${c.id}`} className="group flex h-full flex-col items-center rounded-xl border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/30">
                    <Avatar name={c.parliamentaryName} src={c.photoUrl} color={p?.color} className="size-20 text-xl" />
                    <p className="mt-3 font-semibold group-hover:text-primary">{c.parliamentaryName}</p>
                    <p className="text-xs text-muted-foreground">{c.fullName}</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      {p && (
                        <Badge className="border-transparent text-white" style={{ background: p.color }}>
                          {p.acronym}
                        </Badge>
                      )}
                      {c.boardRole && <Badge tone="primary">{BoardRoleLabel[c.boardRole]}</Badge>}
                    </div>
                    {showAttendance && rate !== null && <p className="mt-auto pt-3 text-xs text-muted-foreground">Presença em sessões: <strong className="text-foreground">{formatPercent(rate)}</strong></p>}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </QueryState>
    </PublicContainer>
  )
}
