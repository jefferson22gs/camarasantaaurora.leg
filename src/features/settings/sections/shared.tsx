import { useEffect, useState, type ReactNode } from 'react'
import { Save, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/display'
import { usePermission } from '@/hooks/useData'
import { settingsService } from '@/services/settingsService'
import type { Organization, OrganizationSettings } from '@/types'

/** Rascunho local editável; salva somente ao clicar em "Salvar". */
export function useDraft<T>(source: T) {
  const [draft, setDraft] = useState<T>(source)
  useEffect(() => setDraft(source), [source])
  const dirty = JSON.stringify(draft) !== JSON.stringify(source)
  return { draft, setDraft, dirty, reset: () => setDraft(source) }
}

export interface SettingsSectionProps {
  org: Organization
  settings: OrganizationSettings
}

/** Wrapper de seção: título, descrição e barra Salvar/Descartar. */
export function SectionCard({ title, description, children, dirty, onSave, onReset, footer }: { title: string; description?: string; children: ReactNode; dirty?: boolean; onSave?: () => Promise<unknown>; onReset?: () => void; footer?: ReactNode }) {
  const [saving, setSaving] = useState(false)
  const can = usePermission()
  const editable = can('settings', 'edit')
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent>
        <fieldset disabled={!editable} className="space-y-5">
          {children}
        </fieldset>
      </CardContent>
      {(onSave || footer) && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3.5">
          {footer}
          {onSave && (
            <>
              {dirty && <span className="mr-auto text-xs text-warning">Alterações não salvas</span>}
              <Button variant="ghost" onClick={onReset} disabled={!dirty || saving}>
                <Undo2 /> Descartar
              </Button>
              <Button
                loading={saving}
                disabled={!dirty || !editable}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await onSave()
                    toast.success(`${title}: configurações salvas.`)
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Falha ao salvar.')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                <Save /> Salvar
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

/** Seção que edita um recorte de OrganizationSettings. */
export function useSettingsDraft<K extends keyof OrganizationSettings>(settings: OrganizationSettings, key: K, sectionName: string) {
  const d = useDraft(settings[key])
  return {
    ...d,
    save: () => settingsService.saveSettings({ ...settings, [key]: d.draft }, sectionName),
  }
}

export function useOrgDraft(org: Organization) {
  const d = useDraft(org)
  return { ...d, save: () => settingsService.saveOrganization(d.draft) }
}

export const grid2 = 'grid gap-4 sm:grid-cols-2'
