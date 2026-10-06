import { useState, type ComponentType } from 'react'
import { Bell, BookOpen, Building2, CalendarDays, FileText, Gavel, Palette, Plug, Scale, Settings, ShieldCheck, Vote, Workflow, ScrollText } from 'lucide-react'
import { Card } from '@/components/ui/display'
import { NativeSelect } from '@/components/ui/form-controls'
import { PageHeader } from '@/components/common/page'
import { ErrorState, PageSkeleton } from '@/components/common/states'
import { useOrganization, useSettings } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import type { SettingsSectionProps } from './sections/shared'
import { BrandingSection, ChamberSection, DocumentsSection, GeneralSection, IntegrationsSection, LegislatureSection, NotificationsSection, SecuritySection, SessionsSection } from './sections/GeneralSections'
import { ProcessFlowSection, PropositionTypesSection } from './sections/LegislativeSections'
import { PresidentSection, QuorumSection, VotingSection } from './sections/VotingSections'

interface SectionDef {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  Component: ComponentType<SettingsSectionProps>
}

const SECTIONS: SectionDef[] = [
  { key: 'geral', label: 'Geral', icon: Settings, Component: GeneralSection },
  { key: 'camara', label: 'Câmara', icon: Building2, Component: ChamberSection },
  { key: 'identidade', label: 'Identidade Visual', icon: Palette, Component: BrandingSection },
  { key: 'legislatura', label: 'Legislatura', icon: BookOpen, Component: LegislatureSection },
  { key: 'proposicoes', label: 'Proposições', icon: FileText, Component: PropositionTypesSection },
  { key: 'tramitacao', label: 'Tramitação', icon: Workflow, Component: ProcessFlowSection },
  { key: 'sessoes', label: 'Sessões', icon: CalendarDays, Component: SessionsSection },
  { key: 'votacao', label: 'Votação', icon: Vote, Component: VotingSection },
  { key: 'quorum', label: 'Quórum', icon: Scale, Component: QuorumSection },
  { key: 'presidencia', label: 'Presidência', icon: Gavel, Component: PresidentSection },
  { key: 'notificacoes', label: 'Notificações', icon: Bell, Component: NotificationsSection },
  { key: 'documentos', label: 'Documentos', icon: ScrollText, Component: DocumentsSection },
  { key: 'seguranca', label: 'Segurança', icon: ShieldCheck, Component: SecuritySection },
  { key: 'integracoes', label: 'Integrações', icon: Plug, Component: IntegrationsSection },
]

export default function SettingsPage() {
  const org = useOrganization()
  const settings = useSettings()
  const [active, setActive] = useState(SECTIONS[0].key)
  const section = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0]

  return (
    <>
      <PageHeader breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Configurações' }]} title="Configurações" description="Parametrização da Câmara: identidade, regras legislativas, votação, quórum e segurança." />
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <div className="lg:hidden">
          <NativeSelect value={active} onChange={(e) => setActive(e.target.value)} aria-label="Categoria de configuração">
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Card className="hidden h-fit p-2 lg:sticky lg:top-24 lg:block">
          <nav aria-label="Categorias de configuração">
            <ul className="space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.key}>
                  <button
                    onClick={() => setActive(s.key)}
                    aria-current={active === s.key ? 'page' : undefined}
                    className={cn('flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted', active === s.key && 'bg-primary/10 font-medium text-primary')}
                  >
                    <s.icon className="size-4 shrink-0" aria-hidden /> {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </Card>
        <div className="min-w-0">
          {org.isLoading || settings.isLoading ? (
            <PageSkeleton />
          ) : !org.data || !settings.data ? (
            <Card>
              <ErrorState
                onRetry={() => {
                  org.refetch()
                  settings.refetch()
                }}
              />
            </Card>
          ) : (
            <section.Component key={section.key} org={org.data} settings={settings.data} />
          )}
        </div>
      </div>
    </>
  )
}
