import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/display'
import { Field, Input, NativeSelect, SwitchField, Textarea } from '@/components/ui/form-controls'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FileUpload } from '@/components/common/page'
import { Crest } from '@/components/common/Brand'
import { useCollection } from '@/hooks/useData'
import { settingsService } from '@/services/settingsService'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { formatPhone } from '@/lib/format'
import { grid2, SectionCard, useOrgDraft, useSettingsDraft, type SettingsSectionProps } from './shared'

export function GeneralSection({ org, settings }: SettingsSectionProps) {
  const t = useSettingsDraft(settings, 'transparency', 'Geral / Transparência')
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState(false)
  const set = (k: keyof typeof t.draft, v: boolean) => t.setDraft({ ...t.draft, [k]: v })
  return (
    <div className="space-y-6">
      <SectionCard title="Transparência" description="Define o que é publicado no Portal da Transparência." dirty={t.dirty} onSave={t.save} onReset={t.reset}>
        <div className={grid2}>
          <SwitchField label="Publicar votos nominais" description="Exibe voto individual de cada vereador em votações nominais." checked={t.draft.publishNominalVotes} onCheckedChange={(v) => set('publishNominalVotes', v)} />
          <SwitchField label="Publicar presenças" description="Exibe a frequência dos vereadores nas sessões." checked={t.draft.publishAttendance} onCheckedChange={(v) => set('publishAttendance', v)} />
          <SwitchField label="Publicar pareceres" description="Disponibiliza pareceres das comissões." checked={t.draft.publishOpinions} onCheckedChange={(v) => set('publishOpinions', v)} />
          <SwitchField label="Publicar atas" description="Disponibiliza atas das sessões encerradas." checked={t.draft.publishMinutes} onCheckedChange={(v) => set('publishMinutes', v)} />
        </div>
      </SectionCard>
      <SectionCard title="Dados de demonstração" description={`Ambiente: ${org.systemName} — ${org.shortName}`}>
        <Alert tone="info">Esta fase utiliza dados simulados armazenados no navegador. Restaurar descarta cadastros, votos, auditoria e configurações alterados.</Alert>
        <Button variant="outline" onClick={() => setConfirm(true)}>
          <RotateCcw /> Restaurar dados de demonstração
        </Button>
      </SectionCard>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Restaurar dados de demonstração?"
        description="Todas as alterações locais serão descartadas e o cenário inicial será recarregado."
        confirmLabel="Restaurar"
        onConfirm={async () => {
          await settingsService.resetDemo()
          await qc.invalidateQueries()
          const user = useAuthStore.getState().user
          if (user) await authService.signIn(user.id).catch(() => authService.signOut())
          toast.success('Dados de demonstração restaurados.')
        }}
      />
    </div>
  )
}

export function ChamberSection({ org }: SettingsSectionProps) {
  const o = useOrgDraft(org)
  const set = <K extends keyof typeof o.draft>(k: K, v: (typeof o.draft)[K]) => o.setDraft({ ...o.draft, [k]: v })
  return (
    <SectionCard title="Câmara" description="Dados institucionais exibidos em documentos, atas e no portal público." dirty={o.dirty} onSave={o.save} onReset={o.reset}>
      <div className={grid2}>
        <Field label="Nome oficial" required className="sm:col-span-2">
          {(id) => <Input id={id} value={o.draft.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label="Nome abreviado">{(id) => <Input id={id} value={o.draft.shortName} onChange={(e) => set('shortName', e.target.value)} />}</Field>
        <Field label="CNPJ">{(id) => <Input id={id} value={o.draft.cnpj} onChange={(e) => set('cnpj', e.target.value)} />}</Field>
        <Field label="Município">{(id) => <Input id={id} value={o.draft.city} onChange={(e) => set('city', e.target.value)} />}</Field>
        <Field label="UF">{(id) => <Input id={id} value={o.draft.state} maxLength={2} onChange={(e) => set('state', e.target.value.toUpperCase())} />}</Field>
        <Field label="Endereço" className="sm:col-span-2">
          {(id) => <Input id={id} value={o.draft.address} onChange={(e) => set('address', e.target.value)} />}
        </Field>
        <Field label="Telefone">{(id) => <Input id={id} value={o.draft.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} />}</Field>
        <Field label="E-mail">{(id) => <Input id={id} type="email" value={o.draft.email} onChange={(e) => set('email', e.target.value)} />}</Field>
        <Field label="Site" className="sm:col-span-2">
          {(id) => <Input id={id} type="url" value={o.draft.website} onChange={(e) => set('website', e.target.value)} />}
        </Field>
      </div>
    </SectionCard>
  )
}

const MAX_IMAGE = 300 * 1024

function readImage(file: File | undefined, onLoad: (url: string) => void) {
  if (!file) return
  if (!file.type.startsWith('image/')) return toast.error('Selecione um arquivo de imagem.')
  if (file.size > MAX_IMAGE) return toast.error('Imagem acima de 300 KB. Reduza o arquivo.')
  const reader = new FileReader()
  reader.onload = () => onLoad(String(reader.result))
  reader.readAsDataURL(file)
}

export function BrandingSection({ org }: SettingsSectionProps) {
  const o = useOrgDraft(org)
  const set = <K extends keyof typeof o.draft>(k: K, v: (typeof o.draft)[K]) => o.setDraft({ ...o.draft, [k]: v })
  const hex = /^#[0-9a-f]{6}$/i
  return (
    <SectionCard title="Identidade visual" description="Personalização white label. As cores e o brasão são aplicados em todo o sistema ao salvar." dirty={o.dirty} onSave={o.save} onReset={o.reset}>
      <div className={grid2}>
        <Field label="Nome da Câmara">{(id) => <Input id={id} value={o.draft.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="Nome do sistema">{(id) => <Input id={id} value={o.draft.systemName} onChange={(e) => set('systemName', e.target.value)} />}</Field>
        {(['primaryColor', 'secondaryColor'] as const).map((k) => (
          <Field key={k} label={k === 'primaryColor' ? 'Cor primária' : 'Cor secundária'} error={hex.test(o.draft[k]) ? undefined : 'Use o formato #RRGGBB'}>
            {(id) => (
              <div className="flex gap-2">
                <input type="color" value={hex.test(o.draft[k]) ? o.draft[k] : '#000000'} onChange={(e) => set(k, e.target.value)} className="h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-card p-1" aria-label={`${k === 'primaryColor' ? 'Cor primária' : 'Cor secundária'} (seletor)`} />
                <Input id={id} value={o.draft[k]} onChange={(e) => set(k, e.target.value)} className="font-mono" />
              </div>
            )}
          </Field>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(
          [
            ['crestUrl', 'Brasão'],
            ['logoUrl', 'Logotipo'],
            ['faviconUrl', 'Favicon'],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="space-y-2">
            <p className="text-sm font-medium">{label}</p>
            {o.draft[k] ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <img src={o.draft[k]} alt={label} className="size-12 object-contain" />
                <Button variant="ghost" size="sm" onClick={() => set(k, undefined)}>
                  Remover
                </Button>
              </div>
            ) : (
              <FileUpload multiple={false} accept="image/*" label={`Enviar ${label.toLowerCase()}`} hint="PNG, SVG ou JPG até 300 KB" onFiles={(f) => readImage(f[0], (url) => set(k, url))} />
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-4" style={{ ['--brand' as string]: o.draft.primaryColor, ['--brand-2' as string]: o.draft.secondaryColor }}>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Prévia</p>
        <div className="flex items-center gap-3 rounded-lg p-3 text-white" style={{ background: o.draft.primaryColor }}>
          <Crest org={o.draft} />
          <div>
            <p className="font-semibold">{o.draft.systemName}</p>
            <p className="text-xs opacity-75">{o.draft.name}</p>
          </div>
          <span className="ml-auto rounded-md px-3 py-1 text-sm font-semibold" style={{ background: o.draft.secondaryColor }}>
            Destaque
          </span>
        </div>
      </div>
    </SectionCard>
  )
}

export function LegislatureSection({ org }: SettingsSectionProps) {
  const o = useOrgDraft(org)
  const { data: legislatures } = useCollection('legislatures')
  return (
    <SectionCard title="Legislatura" description="Legislatura vigente e composição da Câmara usadas nos cálculos de quórum." dirty={o.dirty} onSave={o.save} onReset={o.reset}>
      <div className={grid2}>
        <Field label="Legislatura atual">
          {(id) => (
            <NativeSelect id={id} value={o.draft.currentLegislatureId} onChange={(e) => o.setDraft({ ...o.draft, currentLegislatureId: e.target.value })}>
              {(legislatures ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Quantidade de cadeiras" hint="Composição legal da Câmara (base para maioria absoluta e 2/3).">
          {(id) => <Input id={id} type="number" min={5} max={55} value={o.draft.councilSeats} onChange={(e) => o.setDraft({ ...o.draft, councilSeats: Number(e.target.value) })} />}
        </Field>
      </div>
    </SectionCard>
  )
}

export function SessionsSection({ settings }: SettingsSectionProps) {
  const s = useSettingsDraft(settings, 'sessionDefaults', 'Sessões')
  return (
    <SectionCard title="Sessões" description="Valores padrão para novas sessões plenárias." dirty={s.dirty} onSave={s.save} onReset={s.reset}>
      <div className={grid2}>
        <Field label="Local padrão" className="sm:col-span-2">
          {(id) => <Input id={id} value={s.draft.location} onChange={(e) => s.setDraft({ ...s.draft, location: e.target.value })} />}
        </Field>
        <Field label="Horário padrão de início">{(id) => <Input id={id} type="time" value={s.draft.startTime} onChange={(e) => s.setDraft({ ...s.draft, startTime: e.target.value })} />}</Field>
        <Field label="Duração prevista (minutos)">{(id) => <Input id={id} type="number" min={30} step={15} value={s.draft.durationMinutes} onChange={(e) => s.setDraft({ ...s.draft, durationMinutes: Number(e.target.value) })} />}</Field>
      </div>
    </SectionCard>
  )
}

export function DocumentsSection({ settings }: SettingsSectionProps) {
  const d = useSettingsDraft(settings, 'documents', 'Documentos')
  return (
    <SectionCard title="Documentos" description="Modelos de cabeçalho e rodapé para atas e pautas." dirty={d.dirty} onSave={d.save} onReset={d.reset}>
      <Field label="Cabeçalho da ata">{(id) => <Input id={id} value={d.draft.minutesHeader} onChange={(e) => d.setDraft({ ...d.draft, minutesHeader: e.target.value })} />}</Field>
      <Field label="Encerramento da ata">{(id) => <Textarea id={id} value={d.draft.minutesFooter} onChange={(e) => d.setDraft({ ...d.draft, minutesFooter: e.target.value })} />}</Field>
      <Field label="Cabeçalho da pauta">{(id) => <Input id={id} value={d.draft.agendaHeader} onChange={(e) => d.setDraft({ ...d.draft, agendaHeader: e.target.value })} />}</Field>
    </SectionCard>
  )
}

export function NotificationsSection({ settings }: SettingsSectionProps) {
  const n = useSettingsDraft(settings, 'notifications', 'Notificações')
  const set = (k: keyof typeof n.draft.channels, v: boolean) => n.setDraft({ ...n.draft, channels: { ...n.draft.channels, [k]: v } })
  return (
    <SectionCard title="Notificações" description="Canais de envio das notificações automáticas." dirty={n.dirty} onSave={n.save} onReset={n.reset}>
      <div className={grid2}>
        <SwitchField label="Sistema" description="Central de notificações e sino no cabeçalho." checked={n.draft.channels.system} onCheckedChange={(v) => set('system', v)} />
        <SwitchField label="E-mail" description="Requer serviço de e-mail no backend." checked={n.draft.channels.email} onCheckedChange={(v) => set('email', v)} />
        <SwitchField label="Aplicativo" description="Push notification (fase futura)." checked={n.draft.channels.app} onCheckedChange={(v) => set('app', v)} />
        <SwitchField label="WhatsApp" description="Mediante integração autorizada." checked={n.draft.channels.whatsapp} onCheckedChange={(v) => set('whatsapp', v)} />
      </div>
    </SectionCard>
  )
}

export function SecuritySection({ settings }: SettingsSectionProps) {
  const s = useSettingsDraft(settings, 'security', 'Segurança')
  return (
    <SectionCard title="Segurança" description="Parâmetros de sessão e acesso." dirty={s.dirty} onSave={s.save} onReset={s.reset}>
      <Alert tone="warning" title="Segurança real depende do backend">
        Estes parâmetros são demonstrativos. Autenticação, autorização, integridade dos votos, proteção contra voto duplicado, auditoria imutável e controle de dispositivos devem ser garantidos pelo servidor (Supabase Auth, RLS e Edge Functions).
      </Alert>
      <div className={grid2}>
        <Field label="Expiração da sessão (minutos)">{(id) => <Input id={id} type="number" min={5} value={s.draft.sessionTimeoutMinutes} onChange={(e) => s.setDraft({ ...s.draft, sessionTimeoutMinutes: Number(e.target.value) })} />}</Field>
        <Field label="Tamanho mínimo de senha">{(id) => <Input id={id} type="number" min={8} value={s.draft.passwordMinLength} onChange={(e) => s.setDraft({ ...s.draft, passwordMinLength: Number(e.target.value) })} />}</Field>
        <div className="sm:col-span-2">
          <SwitchField label="Exigir dispositivo cadastrado" description="Votação apenas a partir de tablets previamente autorizados." checked={s.draft.requireDeviceRegistration} onCheckedChange={(v) => s.setDraft({ ...s.draft, requireDeviceRegistration: v })} />
        </div>
      </div>
    </SectionCard>
  )
}

export function IntegrationsSection({ settings }: SettingsSectionProps) {
  const i = useSettingsDraft(settings, 'integrations', 'Integrações')
  return (
    <SectionCard title="Integrações" description="Integração com o portal institucional e serviços externos." dirty={i.dirty} onSave={i.save} onReset={i.reset}>
      <div className={grid2}>
        <Field label="URL do portal da Câmara">{(id) => <Input id={id} type="url" value={i.draft.portalUrl} onChange={(e) => i.setDraft({ ...i.draft, portalUrl: e.target.value })} />}</Field>
        <Field label="Webhook de publicação" hint="Chamado ao publicar resultados (fase backend).">
          {(id) => <Input id={id} type="url" placeholder="https://" value={i.draft.webhookUrl} onChange={(e) => i.setDraft({ ...i.draft, webhookUrl: e.target.value })} />}
        </Field>
      </div>
      <Alert tone="info" title="Supabase (fase 2)">
        A conexão com banco de dados, autenticação, Realtime e Storage será configurada por variáveis de ambiente públicas (URL e chave anon). Chaves privadas e SERVICE_ROLE nunca são armazenadas no frontend.
      </Alert>
    </SectionCard>
  )
}
