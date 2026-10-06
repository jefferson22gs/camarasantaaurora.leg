import { create } from 'zustand'
import { storageService } from '@/services/storage'

export type ThemePreference = 'light' | 'dark' | 'system'

interface UiState {
  theme: ThemePreference
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  commandOpen: boolean
  setTheme: (theme: ThemePreference) => void
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  setCommandOpen: (open: boolean) => void
}

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function applyTheme(theme: ThemePreference) {
  const dark = theme === 'dark' || (theme === 'system' && media().matches)
  document.documentElement.classList.toggle('dark', dark)
}

export const useUiStore = create<UiState>((set) => ({
  theme: storageService.get<ThemePreference>('theme', 'system'),
  sidebarCollapsed: storageService.get('sidebar:collapsed', false),
  mobileNavOpen: false,
  commandOpen: false,
  setTheme: (theme) => {
    storageService.set('theme', theme)
    applyTheme(theme)
    set({ theme })
  },
  toggleSidebar: () =>
    set((s) => {
      storageService.set('sidebar:collapsed', !s.sidebarCollapsed)
      return { sidebarCollapsed: !s.sidebarCollapsed }
    }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
}))

media().addEventListener('change', () => {
  if (useUiStore.getState().theme === 'system') applyTheme('system')
})
