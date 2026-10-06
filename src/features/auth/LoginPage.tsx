import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Building2, Gavel, Globe, Landmark, Monitor, ShieldCheck, UserCog, Users, Vote } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, Avatar, Card } from '@/components/ui/display'
import { Field, NativeSelect } from '@/components/ui/form-controls'
import { Crest } from '@/components/common/Brand'
import { ThemeToggle } from '@/components/layout/HeaderControls'
import { useOrganization } from '@/hooks/useData'
import { authService } from '@/services/authService'
import { ROLES } from '@/domain/auth/permissions'
import { cn } from '@/lib/utils'
import type { RoleKey } from '@/types'

const ROLE_ICON: Record<RoleKey, typeof UserCog> = { admin: UserCog, presidency: Gavel, secretariat: Building2, councilor: Vote, committee: Users }
const ROLE_ORDER: RoleKey[] = ['admin', 'presidency', 'secretariat', 'councilor', 'committee']

export default function LoginPage() {
  const { data: org } = useOrganization()
  const { data: users } = useQuery({ queryKey: ['users', 'demo'], queryFn: authService.listDemoUsers })
  const [role, setRole] = useState<RoleKey>('admin')
  const [userId, setUserId] = useState('')
  const [pending, setPending] = useState(false)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from

  const options = (users ?? []).filter((u) => u.role === role)
  const selected = options.find((u) => u.id === userId) ?? options[0]

  async function enter() {
    if (!selected) return
    setPending(true)
    try {
      const u = await authService.signIn(selected.id)
      toast.success(`Bem-vindo(a), ${u.name}.`)
      navigate(from && from !== '/login' ? from : ROLES[u.role].home, { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao entrar.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-[520px] rounded-full border-[60px] border-brand-2/15" />
        <div className="relative flex items-center gap-3">
          <Crest org={org} className="size-12" />
          <div>
            <p className="font-semibold">{org?.name}</p>
            <p className="text-sm text-white/60">
              {org?.city} — {org?.state}
            </p>
          </div>
        </div>
        <div className="relative mt-auto max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-2">{org?.systemName}</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight">Processo legislativo e votação eletrônica em uma única plataforma.</h1>
          <p className="mt-4 text-white/70">Da proposição ao arquivamento: protocolo, comissões, pareceres, pauta, Ordem do Dia, votação em Plenário, ata e transparência.</p>
          <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-white/80">
            {[
              [Landmark, 'Tramitação rastreável'],
              [Vote, 'Votação nominal, simbólica e secreta'],
              [Monitor, 'Painel do Plenário'],
              [ShieldCheck, 'Auditoria de operações'],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Vote
              return (
                <li key={label as string} className="flex items-center gap-2">
                  <I className="size-4 text-brand-2" aria-hidden /> {label as string}
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:invisible">
            <Crest org={org} className="size-9" />
            <span className="text-sm font-semibold">{org?.shortName}</span>
          </div>
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-10">
          <h2 className="text-2xl font-bold tracking-tight">Acesso ao sistema</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ambiente de demonstração — selecione um perfil para entrar.</p>

          <fieldset className="mt-6">
            <legend className="mb-2 text-sm font-medium">Perfil de acesso</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLE_ORDER.map((r) => {
                const Icon = ROLE_ICON[r]
                const active = role === r
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setRole(r)
                      setUserId('')
                    }}
                    className={cn('flex min-h-20 flex-col items-start gap-2 rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:border-primary/50', active && 'border-primary bg-primary/5 ring-1 ring-primary')}
                  >
                    <Icon className={cn('size-5', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                    <span className="font-medium leading-tight">{ROLES[r].name}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Card className="mt-5 p-4">
            <p className="text-xs text-muted-foreground">{ROLES[role].description}</p>
            {options.length > 1 && (
              <Field label="Usuário" className="mt-3">
                {(id) => (
                  <NativeSelect id={id} value={selected?.id ?? ''} onChange={(e) => setUserId(e.target.value)}>
                    {options.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
            )}
            {selected && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/60 p-2.5">
                <Avatar name={selected.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selected.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
                </div>
              </div>
            )}
          </Card>

          <Button size="lg" className="mt-5 w-full" onClick={enter} loading={pending} disabled={!selected}>
            Entrar como {ROLES[role].name} <ArrowRight />
          </Button>

          <Alert tone="warning" className="mt-6 text-xs" title="Autenticação demonstrativa">
            Nesta fase não há senha nem backend. A proteção de rotas no navegador não substitui autenticação, autorização no servidor e Row Level Security.
          </Alert>

          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link to="/transparencia" className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <Globe className="size-4" /> Portal da Transparência
            </Link>
            <Link to="/plenario" className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <Monitor className="size-4" /> Painel do Plenário
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
