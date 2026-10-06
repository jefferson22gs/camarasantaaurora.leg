import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { Dialog as D } from 'radix-ui'
import { CalendarDays, FileText, Landmark, Search, Users } from 'lucide-react'
import { useCollection, useLookups, usePermission } from '@/hooks/useData'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { SessionTypeLabel } from '@/domain/labels'
import { formatDate } from '@/lib/format'
import { matches } from '@/lib/utils'

/** Busca global (Ctrl+K): número, ementa, autor, assunto, protocolo, vereador, sessão, comissão. */
export function GlobalSearch() {
  const { commandOpen: open, setCommandOpen: setOpen } = useUiStore()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const canView = usePermission()
  const role = useAuthStore((s) => s.user?.role)
  const lk = useLookups()
  const props = useCollection('propositions')
  const sessions = useCollection('sessions')
  const councilors = useCollection('councilors')
  const committees = useCollection('committees')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useUiStore.getState().commandOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const base = role === 'councilor' ? '/vereador' : '/admin'
  const results = useMemo(() => {
    const q = query.trim()
    if (q.length < 2) return null
    return {
      propositions: (props.data ?? [])
        .filter((p) => matches([lk.code(p), lk.title(p), p.summary, p.authorName, p.subject, p.protocolNumber, `${p.number}/${p.year}`], q))
        .slice(0, 8),
      sessions: (sessions.data ?? []).filter((s) => matches([SessionTypeLabel[s.type], `${s.number}/${s.year}`, formatDate(s.date), 'sessão'], q)).slice(0, 5),
      councilors: canView('councilors') ? (councilors.data ?? []).filter((c) => matches([c.parliamentaryName, c.fullName, lk.parties.get(c.partyId)?.acronym], q)).slice(0, 5) : [],
      committees: canView('committees') ? (committees.data ?? []).filter((c) => matches([c.name, c.acronym], q)).slice(0, 4) : [],
    }
  }, [query, props.data, sessions.data, councilors.data, committees.data, lk, canView])

  const go = (path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  const groupClass = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground'
  const itemClass = 'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground'
  const total = results ? results.propositions.length + results.sessions.length + results.councilors.length + results.committees.length : 0

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
        <D.Content aria-describedby={undefined} className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 animate-fade-in overflow-hidden rounded-xl border bg-popover shadow-2xl">
          <D.Title className="sr-only">Busca global</D.Title>
          <Command shouldFilter={false} label="Busca global">
            <div className="flex items-center gap-2 border-b px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Command.Input value={query} onValueChange={setQuery} placeholder="Buscar por número, ementa, autor, assunto, vereador, sessão…" className="h-13 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">ESC</kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              {!results && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Digite ao menos 2 caracteres. Exemplos: “025/2026”, “iluminação”, “Ana Carolina”, “Ordinária 15”.</p>}
              {results && total === 0 && <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhum resultado para “{query}”.</Command.Empty>}
              {results && results.propositions.length > 0 && (
                <Command.Group heading="Proposições" className={groupClass}>
                  {results.propositions.map((p) => (
                    <Command.Item key={p.id} value={p.id} onSelect={() => go(`${base === '/vereador' ? '/vereador/materias' : '/admin/proposicoes'}/${p.id}`)} className={itemClass}>
                      <FileText />
                      <span className="min-w-0">
                        <span className="block font-medium">{lk.title(p)}</span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{p.summary}</span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {results && results.sessions.length > 0 && (
                <Command.Group heading="Sessões" className={groupClass}>
                  {results.sessions.map((s) => (
                    <Command.Item key={s.id} value={s.id} onSelect={() => go(role === 'councilor' ? '/vereador/sessoes' : `/admin/sessoes/${s.id}`)} className={itemClass}>
                      <CalendarDays />
                      <span>
                        Sessão {SessionTypeLabel[s.type]} nº {s.number}/{s.year} <span className="text-muted-foreground">· {formatDate(s.date)}</span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {results && results.councilors.length > 0 && (
                <Command.Group heading="Vereadores" className={groupClass}>
                  {results.councilors.map((c) => (
                    <Command.Item key={c.id} value={c.id} onSelect={() => go(`/admin/vereadores/${c.id}`)} className={itemClass}>
                      <Landmark />
                      <span>
                        {c.parliamentaryName} <span className="text-muted-foreground">· {lk.parties.get(c.partyId)?.acronym}</span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {results && results.committees.length > 0 && (
                <Command.Group heading="Comissões" className={groupClass}>
                  {results.committees.map((c) => (
                    <Command.Item key={c.id} value={c.id} onSelect={() => go(`/admin/comissoes/${c.id}`)} className={itemClass}>
                      <Users />
                      <span>
                        {c.acronym} <span className="text-muted-foreground">· {c.name}</span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
