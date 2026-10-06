import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/display'
import { Checkbox, Field, Input, Label, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { DocumentList, FileUpload, PageHeader } from '@/components/common/page'
import { ErrorState, PageSkeleton } from '@/components/common/states'
import { AccessDenied } from '@/features/auth/ProtectedRoute'
import { useCollection, useLookups, usePermission, useSettings } from '@/hooks/useData'
import { AuthorTypeLabel, PropositionStatusMeta, RegimeLabel, SessionTypeLabel, VotingMethodLabel } from '@/domain/labels'
import { nextPropositionNumber } from '@/domain/legislative/process'
import { fileToDocumentRef, propositionService } from '@/services/propositionService'
import { formatDate, todayISO } from '@/lib/format'
import type { AuthorType, DocumentRef, ProcessingRegime, Proposition, PropositionStatus, VotingMethod } from '@/types'

const PARENT_TYPES = ['EME', 'SUB', 'VET', 'PAR']

const schema = z
  .object({
    typeId: z.string().min(1, 'Selecione o tipo.'),
    number: z.string().regex(/^\d*$/, 'Informe apenas números.'),
    year: z.coerce.number().int().min(1990, 'Ano inválido.').max(2100, 'Ano inválido.'),
    summary: z.string().trim().min(15, 'A ementa deve ter ao menos 15 caracteres.').max(1000, 'Máximo de 1.000 caracteres.'),
    authorType: z.enum(['councilor', 'executive', 'committee', 'board', 'popular']),
    authorId: z.string(),
    authorName: z.string(),
    coauthorIds: z.array(z.string()),
    presentedAt: z.string().min(1, 'Informe a data de apresentação.'),
    presentationSessionId: z.string(),
    subject: z.string().trim().max(200),
    fullText: z.string().trim().min(10, 'Informe o texto integral da proposição.'),
    status: z.string(),
    committeeIds: z.array(z.string()),
    rapporteurId: z.string(),
    regime: z.enum(['ordinary', 'priority', 'urgent', 'special']),
    votingMethod: z.enum(['nominal', 'symbolic', 'secret']),
    quorumRuleId: z.string().min(1, 'Selecione a regra de quórum.'),
    parentId: z.string(),
    notes: z.string().max(2000),
  })
  .superRefine((v, ctx) => {
    if (v.authorType === 'councilor' && !v.authorId) ctx.addIssue({ code: 'custom', path: ['authorId'], message: 'Selecione o vereador autor.' })
    if (v.authorType !== 'councilor' && v.authorName.trim().length < 3) ctx.addIssue({ code: 'custom', path: ['authorName'], message: 'Informe o autor.' })
  })

type FormValues = z.input<typeof schema>

export default function PropositionFormPage() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const can = usePermission()
  const lk = useLookups()
  const settingsQ = useSettings()
  const propositionsQ = useCollection('propositions')
  const sessionsQ = useCollection('sessions')
  const councilorsQ = useCollection('councilors')
  const committeesQ = useCollection('committees')
  const current = editing ? propositionsQ.data?.find((p) => p.id === id) : undefined

  const [attachments, setAttachments] = useState<DocumentRef[]>([])
  const [saving, setSaving] = useState(false)

  const settings = settingsQ.data
  const activeTypes = useMemo(() => (settings?.propositionTypes ?? []).filter((t) => t.active || t.id === current?.typeId), [settings, current])
  const councilors = useMemo(() => (councilorsQ.data ?? []).filter((c) => c.status === 'active' || c.id === current?.authorId), [councilorsQ.data, current])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      typeId: '',
      number: '',
      year: new Date().getFullYear(),
      summary: '',
      authorType: 'councilor',
      authorId: '',
      authorName: '',
      coauthorIds: [],
      presentedAt: todayISO(),
      presentationSessionId: '',
      subject: '',
      fullText: '',
      status: 'filed',
      committeeIds: [],
      rapporteurId: '',
      regime: 'ordinary',
      votingMethod: 'nominal',
      quorumRuleId: 'q_simple',
      parentId: '',
      notes: '',
    },
  })
  const { register, handleSubmit, setValue, reset, control, formState } = form
  const errors = formState.errors

  // Carrega dados na edição.
  useEffect(() => {
    if (!current) return
    reset({
      typeId: current.typeId,
      number: String(current.number),
      year: current.year,
      summary: current.summary,
      authorType: current.authorType,
      authorId: current.authorId ?? '',
      authorName: current.authorName,
      coauthorIds: current.coauthorIds,
      presentedAt: current.presentedAt,
      presentationSessionId: current.presentationSessionId ?? '',
      subject: current.subject,
      fullText: current.fullText,
      status: current.status,
      committeeIds: current.committeeIds,
      rapporteurId: current.rapporteurId ?? '',
      regime: current.regime,
      votingMethod: current.votingMethod,
      quorumRuleId: current.quorumRuleId,
      parentId: current.parentId ?? '',
      notes: current.notes,
    })
    setAttachments(current.attachments)
  }, [current, reset])

  const [typeId, year, authorType, authorId, coauthorIds, committeeIds] = useWatch({ control, name: ['typeId', 'year', 'authorType', 'authorId', 'coauthorIds', 'committeeIds'] })
  const type = settings?.propositionTypes.find((t) => t.id === typeId)
  const suggestedNumber = typeId ? nextPropositionNumber(propositionsQ.data ?? [], typeId, Number(year) || new Date().getFullYear()) : undefined
  const rapporteurOptions = useMemo(() => {
    const committeeMembers = new Set((committeesQ.data ?? []).filter((c) => committeeIds.includes(c.id)).flatMap((c) => c.memberIds))
    return councilors.filter((c) => committeeMembers.size === 0 || committeeMembers.has(c.id))
  }, [committeesQ.data, committeeIds, councilors])

  function onTypeChange(newTypeId: string) {
    setValue('typeId', newTypeId, { shouldValidate: true })
    const t = settings?.propositionTypes.find((x) => x.id === newTypeId)
    if (t && !editing) {
      setValue('quorumRuleId', t.defaultQuorumRuleId)
      setValue('votingMethod', t.defaultVotingMethod)
      if (!t.requiresCommittee) setValue('committeeIds', [])
    }
  }

  function toggleIn(field: 'coauthorIds' | 'committeeIds', value: string, checked: boolean) {
    const list = form.getValues(field)
    setValue(field, checked ? [...list, value] : list.filter((v) => v !== value), { shouldDirty: true })
  }

  async function onSubmit(values: FormValues) {
    const parsed = schema.parse(values)
    const authorName = parsed.authorType === 'councilor' ? (lk.councilors.get(parsed.authorId)?.parliamentaryName ?? '') : parsed.authorName.trim()
    const payload = {
      typeId: parsed.typeId,
      year: parsed.year,
      summary: parsed.summary,
      authorType: parsed.authorType as AuthorType,
      authorId: parsed.authorType === 'councilor' ? parsed.authorId : undefined,
      authorName,
      coauthorIds: parsed.authorType === 'councilor' ? parsed.coauthorIds.filter((c) => c !== parsed.authorId) : [],
      presentedAt: parsed.presentedAt,
      presentationSessionId: parsed.presentationSessionId || undefined,
      subject: parsed.subject,
      fullText: parsed.fullText,
      status: parsed.status as PropositionStatus,
      committeeIds: parsed.committeeIds,
      rapporteurId: parsed.rapporteurId || undefined,
      regime: parsed.regime as ProcessingRegime,
      votingMethod: parsed.votingMethod as VotingMethod,
      quorumRuleId: parsed.quorumRuleId,
      parentId: parsed.parentId || undefined,
      notes: parsed.notes,
    }
    setSaving(true)
    try {
      let saved: Proposition
      if (editing && current) {
        const number = parsed.number ? Number(parsed.number) : current.number
        const duplicate = (propositionsQ.data ?? []).some((p) => p.id !== current.id && p.typeId === payload.typeId && p.year === payload.year && p.number === number)
        if (duplicate) throw new Error(`Já existe proposição deste tipo com o número ${number}/${payload.year}.`)
        saved = await propositionService.update(current.id, { ...payload, number, attachments })
        toast.success('Proposição atualizada com sucesso.')
      } else {
        saved = await propositionService.create({ ...payload, number: parsed.number ? Number(parsed.number) : undefined, attachments })
        toast.success('Proposição cadastrada com sucesso.')
      }
      navigate(`/admin/proposicoes/${saved.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar a proposição.')
    } finally {
      setSaving(false)
    }
  }

  if (!can('propositions', editing ? 'edit' : 'create')) return <AccessDenied home="/admin/proposicoes" />
  if (settingsQ.isLoading || propositionsQ.isLoading || councilorsQ.isLoading) return <PageSkeleton />
  if (editing && !current) return <ErrorState title="Proposição não encontrada" error={new Error('O registro solicitado não existe ou foi excluído.')} />

  const sessions = [...(sessionsQ.data ?? [])].sort((a, b) => b.date.localeCompare(a.date))
  const parentOptions = (propositionsQ.data ?? []).filter((p) => p.id !== id && !p.parentId)

  return (
    <>
      <PageHeader
        title={editing && current ? `Editar ${lk.title(current)}` : 'Nova proposição'}
        description={editing ? 'Alterações são registradas na auditoria.' : 'Ao protocolar, o sistema gera número, protocolo e a primeira movimentação do processo.'}
        breadcrumb={[{ label: 'Administração', to: '/admin/dashboard' }, { label: 'Proposições', to: '/admin/proposicoes' }, { label: editing ? 'Editar' : 'Nova' }]}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Identificação</CardTitle>
                <CardDescription>Tipo, numeração e ementa da matéria.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Tipo" required error={errors.typeId?.message} className="sm:col-span-3">
                {(fid, d) => (
                  <NativeSelect id={fid} aria-describedby={d} aria-invalid={!!errors.typeId} value={typeId} onChange={(e) => onTypeChange(e.target.value)}>
                    <option value="">— Selecione —</option>
                    {activeTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label="Número" error={errors.number?.message} hint={suggestedNumber && !editing ? `Sugerido: ${String(suggestedNumber).padStart(3, '0')} (automático se vazio)` : undefined}>
                {(fid, d) => <Input id={fid} aria-describedby={d} inputMode="numeric" placeholder={suggestedNumber ? String(suggestedNumber) : ''} {...register('number')} />}
              </Field>
              <Field label="Ano" required error={errors.year?.message}>
                {(fid, d) => <Input id={fid} aria-describedby={d} type="number" {...register('year')} />}
              </Field>
              <Field label="Data de apresentação" required error={errors.presentedAt?.message}>
                {(fid, d) => <Input id={fid} aria-describedby={d} type="date" {...register('presentedAt')} />}
              </Field>
              <Field label="Ementa" required error={errors.summary?.message} className="sm:col-span-3">
                {(fid, d) => <Textarea id={fid} aria-describedby={d} aria-invalid={!!errors.summary} rows={3} placeholder="Dispõe sobre…" {...register('summary')} />}
              </Field>
              <Field label="Assunto / palavras-chave" className="sm:col-span-2">
                {(fid) => <Input id={fid} placeholder="Ex.: Saúde; Transparência" {...register('subject')} />}
              </Field>
              <Field label="Sessão de apresentação">
                {(fid) => (
                  <NativeSelect id={fid} {...register('presentationSessionId')}>
                    <option value="">— Não informada —</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {SessionTypeLabel[s.type]} nº {s.number}/{s.year} — {formatDate(s.date)}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              {type && PARENT_TYPES.includes(type.code) && (
                <Field label="Proposição principal" hint="Matéria à qual esta emenda, substitutivo, parecer ou veto se refere." className="sm:col-span-3">
                  {(fid, d) => (
                    <NativeSelect id={fid} aria-describedby={d} {...register('parentId')}>
                      <option value="">— Nenhuma —</option>
                      {parentOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {lk.code(p)} — {p.summary.slice(0, 80)}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Autoria</CardTitle>
                <CardDescription>Autor e coautores da proposição.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de autor" required>
                {(fid) => (
                  <NativeSelect id={fid} {...register('authorType')}>
                    {Object.entries(AuthorTypeLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              {authorType === 'councilor' ? (
                <Field label="Vereador(a) autor(a)" required error={errors.authorId?.message}>
                  {(fid, d) => (
                    <NativeSelect id={fid} aria-describedby={d} aria-invalid={!!errors.authorId} {...register('authorId')}>
                      <option value="">— Selecione —</option>
                      {councilors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parliamentaryName} ({lk.parties.get(c.partyId)?.acronym})
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </Field>
              ) : (
                <Field label="Autor" required error={errors.authorName?.message}>
                  {(fid, d) => <Input id={fid} aria-describedby={d} aria-invalid={!!errors.authorName} placeholder="Ex.: Poder Executivo — Prefeito Municipal" {...register('authorName')} />}
                </Field>
              )}
              {authorType === 'councilor' && (
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium">Coautores</legend>
                  <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {councilors
                      .filter((c) => c.id !== authorId)
                      .map((c) => (
                        <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox checked={coauthorIds.includes(c.id)} onCheckedChange={(v) => toggleIn('coauthorIds', c.id, v === true)} />
                          {c.parliamentaryName}
                        </label>
                      ))}
                  </div>
                </fieldset>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Texto integral</CardTitle>
                <CardDescription>Articulado da proposição. Separe os artigos com uma linha em branco.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Field label="Texto" required error={errors.fullText?.message}>
                {(fid, d) => <Textarea id={fid} aria-describedby={d} aria-invalid={!!errors.fullText} rows={14} className="font-serif text-[15px]" placeholder="Art. 1º …" {...register('fullText')} />}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Anexos</CardTitle>
                <CardDescription>Documentos da proposição (armazenamento simulado nesta fase).</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <FileUpload onFiles={(files) => setAttachments((a) => [...a, ...files.map((f) => fileToDocumentRef(f, a.length === 0 ? 'full_text' : 'attachment'))])} />
              <DocumentList documents={attachments} onRemove={(docId) => setAttachments((a) => a.filter((d) => d.id !== docId))} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tramitação e votação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="Situação" required>
                {(fid) => (
                  <NativeSelect id={fid} {...register('status')}>
                    {(editing ? (Object.keys(PropositionStatusMeta) as PropositionStatus[]) : (['draft', 'filed'] as PropositionStatus[])).map((s) => (
                      <option key={s} value={s}>
                        {PropositionStatusMeta[s].label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label="Regime de tramitação">
                {(fid) => (
                  <NativeSelect id={fid} {...register('regime')}>
                    {Object.entries(RegimeLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label="Tipo de votação">
                {(fid) => (
                  <NativeSelect id={fid} {...register('votingMethod')}>
                    {Object.entries(VotingMethodLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label="Quórum de aprovação" required error={errors.quorumRuleId?.message} hint={settings?.quorumRules.find((q) => q.id === form.getValues('quorumRuleId'))?.description}>
                {(fid, d) => (
                  <NativeSelect id={fid} aria-describedby={d} {...register('quorumRuleId')}>
                    {(settings?.quorumRules ?? []).map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
              {type && !type.requiresVoting && <Alert tone="info">Este tipo de proposição não é submetido à votação em Plenário.</Alert>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comissões</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {type && !type.requiresCommittee && <Alert tone="info">Este tipo dispensa instrução por comissão, mas é possível indicar comissões.</Alert>}
              <fieldset>
                <legend className="sr-only">Comissões competentes</legend>
                <div className="grid gap-2">
                  {(committeesQ.data ?? [])
                    .filter((c) => c.status === 'active' || committeeIds.includes(c.id))
                    .map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-start gap-2 text-sm">
                        <Checkbox className="mt-0.5" checked={committeeIds.includes(c.id)} onCheckedChange={(v) => toggleIn('committeeIds', c.id, v === true)} />
                        <span>
                          <span className="font-medium">{c.acronym}</span> <span className="text-muted-foreground">— {c.name}</span>
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>
              <Field label="Relator">
                {(fid) => (
                  <NativeSelect id={fid} {...register('rapporteurId')}>
                    <option value="">— Não designado —</option>
                    {rapporteurOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parliamentaryName}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={4} {...register('notes')} />
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row xl:flex-col-reverse">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(editing ? `/admin/proposicoes/${id}` : '/admin/proposicoes')}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              <Save /> {editing ? 'Salvar alterações' : 'Cadastrar proposição'}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}
