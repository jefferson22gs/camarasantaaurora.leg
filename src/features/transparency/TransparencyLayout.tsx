import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Dialog as D } from 'radix-ui'
import { ChevronDown, Globe, LockKeyhole, Mail, MapPin, Menu, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/overlay'
import { Crest } from '@/components/common/Brand'
import { PageSkeleton } from '@/components/common/states'
import { ThemeToggle } from '@/components/layout/HeaderControls'
import { useOrganization } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import { PUBLIC_BASE } from './shared'

const MAIN_LINKS = [
  { label: 'Início', to: PUBLIC_BASE, end: true },
  { label: 'Proposições', to: `${PUBLIC_BASE}/proposicoes` },
  { label: 'Sessões', to: `${PUBLIC_BASE}/sessoes` },
  { label: 'Votações', to: `${PUBLIC_BASE}/votacoes` },
  { label: 'Atas', to: `${PUBLIC_BASE}/atas` },
  { label: 'Vereadores', to: `${PUBLIC_BASE}/vereadores` },
]
const MORE_LINKS = [
  { label: 'Pautas', to: `${PUBLIC_BASE}/pautas` },
  { label: 'Pareceres', to: `${PUBLIC_BASE}/pareceres` },
]

/** Layout próprio do Portal da Transparência — independente do AppShell administrativo. */
export default function TransparencyLayout() {
  const { data: org } = useOrganization()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const moreActive = MORE_LINKS.some((l) => location.pathname.startsWith(l.to))

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a href="#conteudo-publico" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Pular para o conteúdo
      </a>

      <div className="no-print bg-sidebar text-[12px] text-white/75">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="truncate">
            {org?.city} — {org?.state} · Poder Legislativo Municipal
          </span>
          <Link to="/login" className="hidden items-center gap-1 hover:text-white sm:inline-flex">
            <LockKeyhole className="size-3" aria-hidden /> Acesso restrito
          </Link>
        </div>
      </div>

      <header className="no-print sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-[72px] sm:px-6">
          <Link to={PUBLIC_BASE} className="flex min-w-0 items-center gap-3" aria-label={`${org?.name ?? 'Câmara Municipal'} — Portal da Transparência, página inicial`}>
            <Crest org={org} className="size-10 sm:size-11" />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-serif text-[15px] font-semibold sm:text-base">{org?.name ?? 'Câmara Municipal'}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Transparência</p>
            </div>
          </Link>

          <nav aria-label="Menu do portal" className="ml-auto hidden items-center gap-0.5 lg:flex">
            {MAIN_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => cn('rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', isActive && 'bg-primary/8 text-primary')}
              >
                {l.label}
              </NavLink>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn('inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground', moreActive && 'bg-primary/8 text-primary')}>
                  Mais <ChevronDown className="size-3.5" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-40">
                {MORE_LINKS.map((l) => (
                  <DropdownMenuItem key={l.to} asChild>
                    <Link to={l.to}>{l.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-2">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to="/login">
                <LockKeyhole /> Acesso restrito
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <D.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-black/50 lg:hidden" />
          <D.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 flex w-[82vw] max-w-xs animate-fade-in flex-col bg-card shadow-2xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <D.Title className="font-semibold">Menu</D.Title>
              <D.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fechar menu">
                <X className="size-5" />
              </D.Close>
            </div>
            <nav aria-label="Menu do portal (móvel)" className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-0.5">
                {[...MAIN_LINKS, ...MORE_LINKS].map((l) => (
                  <li key={l.to}>
                    <NavLink
                      to={l.to}
                      end={l.to === PUBLIC_BASE}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) => cn('block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted', isActive && 'bg-primary/8 text-primary')}
                    >
                      {l.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t p-3">
              <Button asChild className="w-full">
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  <LockKeyhole /> Acesso restrito
                </Link>
              </Button>
            </div>
          </D.Content>
        </D.Portal>
      </D.Root>

      <main id="conteudo-publico" className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
              <PageSkeleton />
            </div>
          }
        >
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <footer className="no-print mt-12 border-t bg-sidebar text-sidebar-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Crest org={org} className="size-11" />
              <div>
                <p className="font-serif font-semibold text-white">{org?.name}</p>
                <p className="text-xs text-white/60">CNPJ {org?.cnpj}</p>
              </div>
            </div>
            <address className="mt-5 space-y-2 text-sm not-italic text-white/75">
              <p className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {org?.address} · {org?.city}/{org?.state}
              </p>
              <p className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {org?.phone}
              </p>
              <p className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <a href={`mailto:${org?.email}`} className="break-all hover:text-white hover:underline">
                  {org?.email}
                </a>
              </p>
              <p className="flex gap-2">
                <Globe className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <a href={org?.website} target="_blank" rel="noopener noreferrer" className="break-all hover:text-white hover:underline">
                  {org?.website?.replace(/^https?:\/\//, '')}
                </a>
              </p>
            </address>
          </div>
          <nav aria-label="Consultas">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Consultas</p>
            <ul className="mt-3 space-y-2 text-sm">
              {[...MAIN_LINKS.slice(1), ...MORE_LINKS].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-white/75 hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Institucional</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/plenario" className="text-white/75 hover:text-white hover:underline">
                  Painel do Plenário (ao vivo)
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-white/75 hover:text-white hover:underline">
                  Acesso restrito
                </Link>
              </li>
            </ul>
            <p className="mt-6 text-xs leading-relaxed text-white/55">Informações publicadas em cumprimento à Lei de Acesso à Informação (Lei nº 12.527/2011). Dados de demonstração.</p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/50 sm:px-6">
            © {new Date().getFullYear()} {org?.name}. {org?.systemName} — Portal da Transparência.
          </p>
        </div>
      </footer>
    </div>
  )
}
