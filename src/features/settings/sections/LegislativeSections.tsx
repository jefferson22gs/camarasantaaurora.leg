import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { Checkbox, Input, NativeSelect, Switch } from '@/components/ui/form-controls'
import { VotingMethodLabel } from '@/domain/labels'
import { uid } from '@/lib/utils'
import type { PropositionTypeConfig, VotingMethod } from '@/types'
import { SectionCard, useSettingsDraft, type SettingsSectionProps } from './shared'

export function PropositionTypesSection({ settings }: SettingsSectionProps) {
  const t = useSettingsDraft(settings, 'propositionTypes', 'Tipos de proposição')
  const update = (id: string, patch: Partial<PropositionTypeConfig>) => t.setDraft(t.draft.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const add = () =>
    t.setDraft([
      ...t.draft,
      { id: uid('pt'), code: 'NOV', name: 'Novo tipo', requiresCommittee: true, requiresVoting: true, defaultQuorumRuleId: settings.quorumRules[0]?.id ?? '', defaultVotingMethod: 'nominal', goesToSanction: false, active: true },
    ])
  const flags: Array<[keyof PropositionTypeConfig, string]> = [
    ['requiresCommittee', 'Comissão'],
    ['requiresVoting', 'Votação'],
    ['goesToSanction', 'Sanção'],
  ]
  return (
    <SectionCard
      title="Tipos de proposição"
      description="Parametrização das espécies legislativas, com quórum e modalidade de votação padrão."
      dirty={t.dirty}
      onSave={t.save}
      onReset={t.reset}
      footer={
        <Button variant="outline" onClick={add} className="mr-auto">
          <Plus /> Adicionar tipo
        </Button>
      }
    >
      <div className="-mx-5">
        <Table>
          <THead>
            <TR>
              <TH>Sigla</TH>
              <TH>Nome</TH>
              {flags.map(([, l]) => (
                <TH key={l} className="text-center">
                  {l}
                </TH>
              ))}
              <TH>Quórum padrão</TH>
              <TH>Votação</TH>
              <TH className="text-center">Ativo</TH>
            </TR>
          </THead>
          <TBody>
            {t.draft.map((ty) => (
              <TR key={ty.id}>
                <TD>
                  <Input value={ty.code} maxLength={5} onChange={(e) => update(ty.id, { code: e.target.value.toUpperCase() })} className="w-20 font-mono" aria-label="Sigla" />
                </TD>
                <TD>
                  <Input value={ty.name} onChange={(e) => update(ty.id, { name: e.target.value })} className="min-w-52" aria-label="Nome" />
                </TD>
                {flags.map(([k, l]) => (
                  <TD key={k} className="text-center">
                    <Checkbox checked={!!ty[k]} onCheckedChange={(v) => update(ty.id, { [k]: v === true })} aria-label={`${l} — ${ty.name}`} />
                  </TD>
                ))}
                <TD>
                  <NativeSelect value={ty.defaultQuorumRuleId} onChange={(e) => update(ty.id, { defaultQuorumRuleId: e.target.value })} className="min-w-44" aria-label="Quórum padrão">
                    {settings.quorumRules.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </NativeSelect>
                </TD>
                <TD>
                  <NativeSelect value={ty.defaultVotingMethod} onChange={(e) => update(ty.id, { defaultVotingMethod: e.target.value as VotingMethod })} className="min-w-32" aria-label="Votação padrão">
                    {(Object.keys(VotingMethodLabel) as VotingMethod[]).map((m) => (
                      <option key={m} value={m}>
                        {VotingMethodLabel[m]}
                      </option>
                    ))}
                  </NativeSelect>
                </TD>
                <TD className="text-center">
                  <Switch checked={ty.active} onCheckedChange={(v) => update(ty.id, { active: v })} aria-label={`Ativo — ${ty.name}`} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </SectionCard>
  )
}

export function ProcessFlowSection({ settings }: SettingsSectionProps) {
  const f = useSettingsDraft(settings, 'processFlow', 'Tramitação')
  const move = (i: number, dir: -1 | 1) => {
    const next = [...f.draft]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    f.setDraft(next)
  }
  return (
    <SectionCard title="Fluxo de tramitação" description="Etapas do processo legislativo, configuráveis conforme o Regimento Interno." dirty={f.dirty} onSave={f.save} onReset={f.reset}>
      <ol className="space-y-2">
        {f.draft.map((s, i) => (
          <li key={s.key} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <Switch checked={s.enabled} onCheckedChange={(v) => f.setDraft(f.draft.map((x) => (x.key === s.key ? { ...x, enabled: v } : x)))} aria-label={`Etapa ${s.label} habilitada`} />
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <Input value={s.label} onChange={(e) => f.setDraft(f.draft.map((x) => (x.key === s.key ? { ...x, label: e.target.value } : x)))} aria-label="Rótulo da etapa" />
              <Input value={s.unit} onChange={(e) => f.setDraft(f.draft.map((x) => (x.key === s.key ? { ...x, unit: e.target.value } : x)))} aria-label="Unidade responsável" placeholder="Unidade responsável" />
            </div>
            <div className="flex items-center gap-1">
              {!s.enabled && <Badge>Desabilitada</Badge>}
              <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Mover ${s.label} para cima`}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={i === f.draft.length - 1} onClick={() => move(i, 1)} aria-label={`Mover ${s.label} para baixo`}>
                <ArrowDown />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}
