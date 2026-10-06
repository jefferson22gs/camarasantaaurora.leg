import { useEffect } from 'react'
import { useOrganization } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import type { Organization } from '@/types'

/**
 * Aplica a identidade visual da Câmara (white label): cores, título e favicon.
 * Nenhum componente usa nome/cor da Câmara diretamente — sempre via organizationConfig.
 */
export function useBranding() {
  const { data: org } = useOrganization()
  useEffect(() => {
    if (!org) return
    const root = document.documentElement
    root.style.setProperty('--brand', org.primaryColor)
    root.style.setProperty('--brand-2', org.secondaryColor)
    document.title = `${org.systemName} · ${org.shortName}`
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link && org.faviconUrl) link.href = org.faviconUrl
  }, [org])
  return org
}

/** Brasão: imagem configurada ou emblema institucional padrão gerado a partir das cores. */
export function Crest({ org, className }: { org?: Pick<Organization, 'crestUrl' | 'logoUrl' | 'name'> | null; className?: string }) {
  const src = org?.crestUrl || org?.logoUrl
  if (src) return <img src={src} alt={`Brasão — ${org?.name}`} className={cn('size-10 shrink-0 object-contain', className)} />
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={`Brasão — ${org?.name ?? 'Câmara Municipal'}`} className={cn('size-10 shrink-0', className)}>
      <path d="M24 3 42 9v14c0 11-7.6 19.4-18 22C13.6 42.4 6 34 6 23V9z" fill="var(--brand)" stroke="var(--brand-2)" strokeWidth="2" />
      <path d="M14 21 24 14l10 7v2H14z" fill="var(--brand-2)" />
      <path d="M16 25h3v9h-3zm6.5 0h3v9h-3zm6.5 0h3v9h-3zM14 35h20v2.5H14z" fill="#fff" />
    </svg>
  )
}

export function BrandMark({ compact, inverted }: { compact?: boolean; inverted?: boolean }) {
  const { data: org } = useOrganization()
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Crest org={org} className="size-9" />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className={cn('truncate text-sm font-semibold', inverted ? 'text-white' : 'text-foreground')}>{org?.systemName ?? 'Sistema Legislativo'}</p>
          <p className={cn('truncate text-[11px]', inverted ? 'text-white/65' : 'text-muted-foreground')}>{org?.shortName ?? '…'}</p>
        </div>
      )}
    </div>
  )
}
