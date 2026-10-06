import { useMemo, useState } from 'react'
import { FileSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/form-controls'
import { StatusBadge } from '@/components/ui/display'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { SearchInput } from '@/components/common/page'
import { EmptyState } from '@/components/common/states'
import type { Lookups } from '@/hooks/useData'
import { PropositionStatusMeta } from '@/domain/labels'
import { matches } from '@/lib/utils'
import type { Proposition, PropositionStatus } from '@/types'

const ELIGIBLE: PropositionStatus[] = ['ready_for_agenda', 'in_committee', 'filed', 'on_agenda']

export function AddItemsDialog({ open, onOpenChange, propositions, excludeIds, lk, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; propositions: Proposition[]; excludeIds: Set<string>; lk: Lookups; onAdd: (ids: string[]) => void }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const candidates = useMemo(
    () =>
      propositions
        .filter((p) => ELIGIBLE.includes(p.status) && !excludeIds.has(p.id))
        .filter((p) => matches([lk.code(p), lk.title(p), p.summary, p.authorName, p.subject], search))
        // Matérias aptas primeiro.
        .sort((a, b) => Number(b.status === 'ready_for_agenda') - Number(a.status === 'ready_for_agenda') || b.presentedAt.localeCompare(a.presentedAt)),
    [propositions, excludeIds, search, lk],
  )

  const close = (o: boolean) => {
    if (!o) {
      setSelected([])
      setSearch('')
    }
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Adicionar matérias à pauta"
        description="Matérias aptas para pauta aparecem primeiro. Matérias ainda em comissão podem ser incluídas por deliberação da Presidência."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button
              disabled={selected.length === 0}
              onClick={() => {
                onAdd(selected)
                close(false)
              }}
            >
              Adicionar {selected.length > 0 ? `(${selected.length})` : ''}
            </Button>
          </>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número, ementa, autor…" className="mb-3 sm:max-w-none" />
        {candidates.length === 0 ? (
          <EmptyState icon={FileSearch} title="Nenhuma matéria disponível" description="Todas as matérias elegíveis já estão na pauta ou não correspondem à busca." className="py-8" />
        ) : (
          <ul className="divide-y rounded-lg border">
            {candidates.map((p) => {
              const checked = selected.includes(p.id)
              return (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/50">
                    <Checkbox checked={checked} onCheckedChange={(v) => setSelected((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))} className="mt-0.5" aria-label={lk.title(p)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{lk.title(p)}</span>
                        <StatusBadge meta={PropositionStatusMeta[p.status]} />
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{p.summary}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Autor: {p.authorName}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
