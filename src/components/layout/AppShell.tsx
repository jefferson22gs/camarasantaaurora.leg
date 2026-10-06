import { Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Dialog as D } from 'radix-ui'
import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/display'
import { BrandMark } from '@/components/common/Brand'
import { PageSkeleton } from '@/components/common/states'
import { AREA_LABEL, NAVIGATION, type AppArea, type NavGroup } from '@/config/navigation'
import { usePermission } from '@/hooks/useData'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { DemoSwitcher } from './DemoSwitcher'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell, ThemeToggle, UserMenu } from './HeaderControls'

function useNav(area: AppArea): NavGroup[] {
  const can = usePermission()
  return NAVIGATION[area].map((g) => ({ ...g, items: g.items.filter((i) => !i.module || can(i.module)) })).filter((g) => g.items.length > 0)
}

function NavList({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação principal" className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
      {groups.map((g) => (
        <div key={g.label}>
          {!collapsed && <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/45">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const link = (
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  end={item.to.endsWith('dashboard')}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-white/8 hover:text-white',
                      isActive && 'bg-white/12 text-white before:absolute before:inset-y-1.5 before:-left-3 before:w-1 before:rounded-r-full before:bg-brand-2',
                      collapsed && 'justify-center px-0',
                    )
                  }
                >
                  <item.icon className="size-[18px] shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && <span className="sr-only">{item.label}</span>}
                </NavLink>
              )
              return (
                <li key={item.to}>
                  {collapsed ? (
                    <Tooltip content={item.label} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function AppShell({ area }: { area: AppArea }) {
  const groups = useNav(area)
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen, setCommandOpen } = useUiStore()
  const location = useLocation()

  return (
    <div className="flex min-h-dvh">
      <a href="#conteudo" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Pular para o conteúdo
      </a>

      {/* Sidebar desktop */}
      <aside className={cn('no-print sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex', sidebarCollapsed ? 'w-[72px]' : 'w-64')}>
        <div className={cn('flex h-16 items-center border-b border-white/10 px-4', sidebarCollapsed && 'justify-center px-0')}>
          <BrandMark compact={sidebarCollapsed} inverted />
        </div>
        {!sidebarCollapsed && <p className="px-6 pt-4 text-[11px] font-medium text-brand-2">{AREA_LABEL[area]}</p>}
        <NavList groups={groups} collapsed={sidebarCollapsed} />
        <div className="border-t border-white/10 p-3">
          <Button variant="ghost" size="sm" onClick={toggleSidebar} className={cn('w-full text-sidebar-foreground/70 hover:bg-white/8 hover:text-white', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')} aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}>
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!sidebarCollapsed && 'Recolher menu'}
          </Button>
        </div>
      </aside>

      {/* Drawer tablet/mobile */}
      <D.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-black/50 lg:hidden" />
          <D.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-72 animate-slide-in flex-col bg-sidebar text-sidebar-foreground shadow-2xl lg:hidden">
            <D.Title className="sr-only">Menu de navegação</D.Title>
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <BrandMark inverted />
              <D.Close className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Fechar menu">
                <X className="size-5" />
              </D.Close>
            </div>
            <p className="px-6 pt-4 text-[11px] font-medium text-brand-2">{AREA_LABEL[area]}</p>
            <NavList groups={groups} onNavigate={() => setMobileNavOpen(false)} />
          </D.Content>
        </D.Portal>
      </D.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md sm:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
            <Menu />
          </Button>
          <button
            onClick={() => setCommandOpen(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-ring/50 sm:max-w-md"
            aria-label="Abrir busca global"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Buscar proposições, sessões, vereadores…</span>
            <kbd className="ml-auto hidden rounded border bg-muted px-1.5 text-[10px] md:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <DemoSwitcher />
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSkeleton />}>
            <div key={location.pathname} className="animate-fade-in">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      <GlobalSearch />
    </div>
  )
}
