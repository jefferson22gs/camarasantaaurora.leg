import { useNavigate } from 'react-router-dom'
import { Eye, Globe, Monitor, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { authService } from '@/services/authService'
import { settingsService } from '@/services/settingsService'
import { ROLES } from '@/domain/auth/permissions'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

/** Usuários de demonstração por perfil (ids do dataset mock). */
export const DEMO_PROFILES = [
  { userId: 'usr_admin', role: 'admin' },
  { userId: 'usr_pres', role: 'presidency' },
  { userId: 'usr_sec', role: 'secretariat' },
  { userId: 'usr_cv_02', role: 'councilor' },
  { userId: 'usr_com', role: 'committee' },
] as const

/**
 * Seletor "Visualizar como" — ferramenta de demonstração.
 * Exibido somente em ambiente de desenvolvimento ou quando VITE_DEMO_MODE !== 'false'.
 * Em produção real, definir VITE_DEMO_MODE=false.
 */
export const DEMO_MODE = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'

export function DemoSwitcher() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [confirmReset, setConfirmReset] = useState(false)
  if (!DEMO_MODE) return null

  async function switchTo(userId: string) {
    const u = await authService.signIn(userId)
    toast.success(`Visualizando como ${ROLES[u.role].name}: ${u.name}`)
    navigate(ROLES[u.role].home)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="no-print gap-1.5 border-dashed" aria-label="Visualizar como (modo demonstração)">
            <Eye /> <span className="hidden sm:inline">Visualizar como</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Modo demonstração</DropdownMenuLabel>
          {DEMO_PROFILES.map((p) => (
            <DropdownMenuItem key={p.userId} onSelect={() => switchTo(p.userId)} className={user?.id === p.userId ? 'font-semibold' : undefined}>
              <Eye /> {ROLES[p.role].name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => window.open('/plenario', '_blank', 'noopener')}>
            <Monitor /> Painel do Plenário (nova aba)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/transparencia')}>
            <Globe /> Portal da Transparência
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmReset(true)}>
            <RotateCcw /> Restaurar dados de demonstração
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Restaurar dados de demonstração?"
        description="Todas as alterações feitas no navegador (cadastros, votos, auditoria) serão descartadas e o cenário inicial será recarregado."
        confirmLabel="Restaurar"
        onConfirm={async () => {
          await settingsService.resetDemo()
          await qc.invalidateQueries()
          const current = useAuthStore.getState().user
          if (current) await authService.signIn(current.id).catch(() => authService.signOut())
          toast.success('Dados de demonstração restaurados.')
        }}
      />
    </>
  )
}
