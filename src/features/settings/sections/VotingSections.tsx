import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, Badge } from '@/components/ui/display'
import { CheckboxField, Field, Input, NativeSelect, RadioGroup, RadioItem, SwitchField, Textarea } from '@/components/ui/form-controls'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { describeQuorumRule, getDeliberationQuorum, getQuorumBaseValue, getRequiredVotes, QUORUM_BASE_LABEL } from '@/domain/quorum/quorumEngine'
import { QuorumTypeLabel } from '@/domain/labels'
import { uid } from '@/lib/utils'
import type { DeliberationQuorum, PresidentVotingMode, QuorumBase, QuorumRule, QuorumThreshold, QuorumType, VoteTally } from '@/types'
import { grid2, SectionCard, useSettingsDraft, type SettingsSectionProps } from './shared'

export function VotingSection({ settings }: SettingsSectionProps) {
  const v = useSettingsDraft(settings, 'voting', 'Votação')
  const set = <K extends keyof typeof v.draft>(k: K, val: (typeof v.draft)[K]) => v.setDraft({ ...v.draft, [k]: val })
  return (
    <SectionCard title="Votação" description="Parâmetros da votação eletrônica em Plenário." dirty={v.dirty} onSave={v.save} onReset={v.reset}>
      <div className={grid2}>
        <Field label="Tempo padrão da votação (segundos)" hint="Cronômetro exibido para Presidência, vereadores e painel.">
          {(id) => <Input id={id} type="number" min={15} step={15} value={v.draft.defaultDurationSeconds} onChange={(e) => set('defaultDurationSeconds', Number(e.target.value))} />}
        </Field>
        <Field label="Quórum de deliberação (presença mínima)">
          {(id) => (
            <NativeSelect id={id} value={v.draft.deliberationQuorum} onChange={(e) => set('deliberationQuorum', e.target.value as DeliberationQuorum)}>
              <option value="absolute_majority">Maioria absoluta dos membros</option>
              <option value="one_third">Um terço dos membros</option>
              <option value="none">Sem exigência</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="Sem quórum de presença">
          {(id) => (
            <NativeSelect id={id} value={v.draft.withoutQuorumBehavior} onChange={(e) => set('withoutQuorumBehavior', e.target.value as 'block' | 'warn')}>
              <option value="block">Impedir abertura da votação</option>
              <option value="warn">Apenas alertar</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="Empate sem voto de desempate">
          {(id) => (
            <NativeSelect id={id} value={v.draft.tieOutcome} onChange={(e) => set('tieOutcome', e.target.value as 'rejected' | 'tie')}>
              <option value="rejected">Considerar rejeitada</option>
              <option value="tie">Registrar empate (nova votação)</option>
            </NativeSelect>
          )}
        </Field>
        <SwitchField label="Encerramento automático" description="Encerra a votação quando o cronômetro zerar." checked={v.draft.automaticClose} onCheckedChange={(x) => set('automaticClose', x)} />
        <SwitchField label="Permitir abstenção" description="Exibe a opção ABSTENÇÃO na tela do vereador." checked={v.draft.allowAbstention} onCheckedChange={(x) => set('allowAbstention', x)} />
        <SwitchField label="Permitir reabertura" description="A Presidência pode reabrir votação mediante justificativa auditada." checked={v.draft.allowReopen} onCheckedChange={(x) => set('allowReopen', x)} />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Nomenclatura das opções de voto</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['yes', 'Favorável'],
              ['no', 'Contrário'],
              ['abstention', 'Abstenção'],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={l}>
              {(id) => <Input id={id} value={v.draft.labels[k]} onChange={(e) => set('labels', { ...v.draft.labels, [k]: e.target.value })} />}
            </Field>
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

/** Cenário de referência da prévia de quórum. */
const PREVIEW: VoteTally = { members: 12, present: 11, eligible: 10, impeded: 1, absent: 1, yes: 6, no: 3, abstention: 1, notVoted: 0 }

function previewText(rule: QuorumRule) {
  const base = getQuorumBaseValue(rule, PREVIEW)
  return `Com 12 membros, 11 presentes e 10 aptos (6 SIM, 3 NÃO, 1 abstenção): base ${base} ${QUORUM_BASE_LABEL[rule.base]} → ${getRequiredVotes(rule, base)} voto(s) SIM necessários.`
}

const EMPTY_RULE = (): QuorumRule => ({ id: uid('q'), name: '', type: 'custom', base: 'votes_cast', threshold: 'majority', abstentions: 'exclude', description: '' })

export function QuorumSection({ settings }: SettingsSectionProps) {
  const q = useSettingsDraft(settings, 'quorumRules', 'Quórum')
  const [editing, setEditing] = useState<QuorumRule | null>(null)
  const inUse = (id: string) => settings.propositionTypes.some((t) => t.defaultQuorumRuleId === id)

  function saveRule(rule: QuorumRule) {
    if (rule.name.trim().length < 3) return toast.error('Informe o nome da regra.')
    if (rule.threshold === 'fraction' && (!rule.numerator || !rule.denominator || rule.numerator > rule.denominator)) return toast.error('Fração inválida.')
    q.setDraft(q.draft.some((r) => r.id === rule.id) ? q.draft.map((r) => (r.id === rule.id ? rule : r)) : [...q.draft, rule])
    setEditing(null)
  }

  return (
    <SectionCard
      title="Regras de quórum"
      description="Regras parametrizáveis usadas pelo QuorumEngine na apuração. Nenhuma fórmula fica fixa no código das telas."
      dirty={q.dirty}
      onSave={q.save}
      onReset={q.reset}
      footer={
        <Button variant="outline" className="mr-auto" onClick={() => setEditing(EMPTY_RULE())}>
          <Plus /> Nova regra
        </Button>
      }
    >
      <ul className="space-y-3">
        {q.draft.map((r) => (
          <li key={r.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {r.name} <Badge className="ml-1">{QuorumTypeLabel[r.type]}</Badge>
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{describeQuorumRule(r)}{r.base === 'votes_cast' ? (r.abstentions === 'include' ? ' (abstenções incluídas)' : ' (abstenções excluídas)') : ''}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label={`Editar ${r.name}`}>
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" disabled={inUse(r.id)} aria-label={`Excluir ${r.name}`}>
                      <Trash2 />
                    </Button>
                  }
                  title="Excluir regra de quórum?"
                  description={`A regra "${r.name}" será removida ao salvar.`}
                  confirmLabel="Excluir"
                  onConfirm={() => q.setDraft(q.draft.filter((x) => x.id !== r.id))}
                />
              </div>
            </div>
            {r.description && <p className="mt-2 text-sm">{r.description}</p>}
            <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{previewText(r)}</p>
          </li>
        ))}
      </ul>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <QuorumRuleDialog rule={editing} onSave={saveRule} />}
      </Dialog>
    </SectionCard>
  )
}

function QuorumRuleDialog({ rule, onSave }: { rule: QuorumRule; onSave: (r: QuorumRule) => void }) {
  const [r, setR] = useState(rule)
  const set = <K extends keyof QuorumRule>(k: K, v: QuorumRule[K]) => setR({ ...r, [k]: v })
  return (
    <DialogContent
      size="lg"
      title={rule.name ? 'Editar regra de quórum' : 'Nova regra de quórum'}
      footer={<Button onClick={() => onSave(r)}>Aplicar</Button>}
    >
      <div className="space-y-4">
        <div className={grid2}>
          <Field label="Nome" required>{(id) => <Input id={id} value={r.name} onChange={(e) => set('name', e.target.value)} />}</Field>
          <Field label="Tipo">
            {(id) => (
              <NativeSelect id={id} value={r.type} onChange={(e) => set('type', e.target.value as QuorumType)}>
                {(Object.keys(QuorumTypeLabel) as QuorumType[]).map((t) => (
                  <option key={t} value={t}>
                    {QuorumTypeLabel[t]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Base de cálculo">
            {(id) => (
              <NativeSelect id={id} value={r.base} onChange={(e) => set('base', e.target.value as QuorumBase)}>
                {(Object.keys(QUORUM_BASE_LABEL) as QuorumBase[]).map((b) => (
                  <option key={b} value={b}>
                    {QUORUM_BASE_LABEL[b].charAt(0).toUpperCase() + QUORUM_BASE_LABEL[b].slice(1)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Critério">
            {(id) => (
              <NativeSelect id={id} value={r.threshold} onChange={(e) => set('threshold', e.target.value as QuorumThreshold)}>
                <option value="majority">Mais da metade</option>
                <option value="fraction">Fração (ao menos)</option>
                <option value="fixed">Número fixo de votos</option>
              </NativeSelect>
            )}
          </Field>
          {r.threshold === 'fraction' && (
            <>
              <Field label="Numerador">{(id) => <Input id={id} type="number" min={1} value={r.numerator ?? ''} onChange={(e) => set('numerator', Number(e.target.value))} />}</Field>
              <Field label="Denominador">{(id) => <Input id={id} type="number" min={1} value={r.denominator ?? ''} onChange={(e) => set('denominator', Number(e.target.value))} />}</Field>
            </>
          )}
          {r.threshold === 'fixed' && <Field label="Votos necessários">{(id) => <Input id={id} type="number" min={1} value={r.fixedVotes ?? ''} onChange={(e) => set('fixedVotes', Number(e.target.value))} />}</Field>}
          {r.base === 'votes_cast' && (
            <Field label="Abstenções">
              {(id) => (
                <NativeSelect id={id} value={r.abstentions} onChange={(e) => set('abstentions', e.target.value as 'include' | 'exclude')}>
                  <option value="exclude">Não compõem a base</option>
                  <option value="include">Compõem a base (contam contra)</option>
                </NativeSelect>
              )}
            </Field>
          )}
        </div>
        <Field label="Descrição / fundamento regimental">{(id) => <Textarea id={id} value={r.description} onChange={(e) => set('description', e.target.value)} />}</Field>
        <Alert tone="info">{previewText(r)}</Alert>
      </div>
    </DialogContent>
  )
}

export function PresidentSection({ settings, org }: SettingsSectionProps) {
  const p = useSettingsDraft(settings, 'presidentRule', 'Presidência')
  const toggleType = (t: QuorumType, on: boolean) => p.setDraft({ ...p.draft, votesOnQuorumTypes: on ? [...p.draft.votesOnQuorumTypes, t] : p.draft.votesOnQuorumTypes.filter((x) => x !== t) })
  return (
    <SectionCard title="Regra do Presidente" description="Participação do Presidente nas votações, conforme o Regimento Interno." dirty={p.dirty} onSave={p.save} onReset={p.reset}>
      <RadioGroup value={p.draft.mode} onValueChange={(v) => p.setDraft({ ...p.draft, mode: v as PresidentVotingMode })} aria-label="Modo de voto do Presidente">
        <RadioItem value="normal" label="Vota normalmente" description="O Presidente vota em todas as matérias como os demais vereadores." />
        <RadioItem value="never" label="Não vota" description="O Presidente não vota, salvo eventual voto de desempate." />
        <RadioItem value="specific" label="Vota apenas em situações específicas" description="Ex.: matérias que exigem maioria absoluta ou 2/3 e votações secretas." />
      </RadioGroup>
      {p.draft.mode === 'specific' && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">O Presidente vota quando o quórum da matéria for:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(QuorumTypeLabel) as QuorumType[]).map((t) => (
              <CheckboxField key={t} label={QuorumTypeLabel[t]} checked={p.draft.votesOnQuorumTypes.includes(t)} onCheckedChange={(v) => toggleType(t, v === true)} />
            ))}
          </div>
          <CheckboxField label="Votações secretas" checked={p.draft.votesOnSecret} onCheckedChange={(v) => p.setDraft({ ...p.draft, votesOnSecret: v === true })} />
        </div>
      )}
      <SwitchField label="Voto de desempate (minerva)" description="Em caso de empate, a Presidência é solicitada a desempatar antes de proclamar o resultado." checked={p.draft.tiebreak} onCheckedChange={(v) => p.setDraft({ ...p.draft, tiebreak: v })} />
      <p className="text-xs text-muted-foreground">Quórum de presença com {org.councilSeats} cadeiras: {getDeliberationQuorum(org.councilSeats, settings.voting.deliberationQuorum)} vereadores.</p>
    </SectionCard>
  )
}
