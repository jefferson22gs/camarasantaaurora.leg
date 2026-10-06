import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileCheck2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Card, StatusBadge, TBody, TD, TH, THead, TR, Table } from '@/components/ui/display'
import { Dialog, SheetContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/overlay'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DocumentList, FileUpload, PageHeader, Pagination, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useAction, useCollection, useLookups, usePermission } from '@/hooks/useData'
import { useAuthStore } from '@/stores/authStore'
import { OpinionConclusionMeta, OpinionStatusMeta } from '@/domain/labels'
import { fileToDocumentRef, opinionService } from '@/services/propositionService'
import { formatDate, todayISO } from '@/lib/format'
import { cn, matches } from '@/lib/utils'
import type { DocumentRef, Opinion, OpinionConclusion, OpinionStatus } from '@/types'

type StatusTab = OpinionStatus | 'all'

export default function OpinionsPage() {
  const can = usePermission()
  const lk = useLookups()
  const user = useAuthStore((s) => s.user)
  const opinionsQ = useCollection('opinions')
  const propositionsQ = useCollection('propositions')
  const [tab, setTab] = useState<StatusTab>('all')
  const [conclusion, setConclusion] = useState<OpinionConclusion | ''>('')
  const [committeeId, setCommitteeId] = useState(user?.role === 'committee' ? (user.committeeId ?? '') : '')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Opinion | 'new' | null>(null)

  const propMap = useMemo(() => new Map((propositionsQ.data ?? []).map((p) => [p.id, p])), [propositionsQ.data])
  const today = todayISO()

  const base = useMemo(() => (opinionsQ.data ?? []).filter((o) => !committeeId || o.committeeId === committeeId), [opinionsQ.data, committeeId])
  const counts = useMemo(() => ({ all: base.length, pending: base.filter((o) => o.status === 'pending').length, drafting: base.filter((o) => o.status === 'drafting').length, completed: base.filter((o) => o.status === 'completed').length }), [base])

  const filtered = useMemo(
    () =>
      base
        .filter((o) => (tab === 'all' || o.status === tab) && (!conclusion || o.conclusion === conclusion))
        .filter((o) => {
          const p = propMap.get(o.propositionId)
          return matches([p ? lk.code(p) : '', p?.summary, lk.councilorName(o.rapporteurId), lk.committees.get(o.committeeId)?.acronym], search)
        })
        .sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0) || a.dueDate.localeCompare(b.dueDate)),
    [base, tab, conclusion, search, propMap, lk],
  )
  const pagination = usePagination(filtered, 12)
  const remove = useAction(opinionService.remove, { success: 'Parecer excluído.' })
  const canCreate = can('opinions', 'create')
  const canEdit = can('opinions', 'edit')

  return (
    <>
      <PageHeader
        title="Pareceres"
        description="Pareceres das comissões: distribuição, elaboração pelo relator e conclusão."
        breadcrumb={[{ label: 'Administração', to: '/admin/dashboard' }, { label: 'Pareceres' }]}
        actions={
          canCreate && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> Novo parecer
            </Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({counts.pending})</TabsTrigger>
          <TabsTrigger value="drafting">Em elaboração ({counts.drafting})</TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({counts.completed})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Matéria, relator, comissão…" className="w-full sm:w-auto" />
          <NativeSelect aria-label="Filtrar por comissão" value={committeeId} onChange={(e) => setCommitteeId(e.target.value)} className="w-full sm:w-auto">
            <option value="">Todas as comissões</option>
            {[...lk.committees.values()].map((c) => (
              <option key={c.id} value={c.id}>
                {c.acronym}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Filtrar por conclusão" value={conclusion} onChange={(e) => setConclusion(e.target.value as OpinionConclusion | '')} className="w-full sm:w-auto">
            <option value="">Todas as conclusões</option>
            {Object.entries(OpinionConclusionMeta).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
        </Toolbar>
        <QueryState query={opinionsQ} isEmpty={() => filtered.length === 0} empty={<EmptyState icon={FileCheck2} title="Nenhum parecer encontrado" description="Ajuste os filtros ou cadastre um novo parecer." />}>
          {() => (
            <>
              <Table>
                <THead>
                  <tr>
                    <TH>Matéria</TH>
                    <TH>Comissão</TH>
                    <TH>Relator</TH>
                    <TH>Prazo / emissão</TH>
                    <TH>Situação</TH>
                    <TH>Conclusão</TH>
                    <TH className="text-right">Ações</TH>
                  </tr>
                </THead>
                <TBody>
                  {pagination.slice.map((o) => {
                    const p = propMap.get(o.propositionId)
                    const late = o.status !== 'completed' && o.dueDate < today
                    return (
                      <TR key={o.id}>
                        <TD className="min-w-56 max-w-md">
                          {p ? (
                            <Link to={`/admin/proposicoes/${p.id}`} className="font-semibold text-primary hover:underline">
                              {lk.code(p)}
                            </Link>
                          ) : (
                            '—'
                          )}
                          <p className="line-clamp-1 text-xs text-muted-foreground">{p?.summary}</p>
                        </TD>
                        <TD className="whitespace-nowrap">{lk.committees.get(o.committeeId)?.acronym}</TD>
                        <TD className="whitespace-nowrap">{lk.councilorName(o.rapporteurId)}</TD>
                        <TD className={cn('whitespace-nowrap tabular', late && 'font-medium text-danger')}>
                          {o.issuedAt ? `Emitido ${formatDate(o.issuedAt)}` : `${formatDate(o.dueDate)}${late ? ' (vencido)' : ''}`}
                        </TD>
                        <TD>
                          <StatusBadge meta={OpinionStatusMeta[o.status]} />
                        </TD>
                        <TD>{o.conclusion ? <StatusBadge meta={OpinionConclusionMeta[o.conclusion]} /> : <span className="text-muted-foreground">—</span>}</TD>
                        <TD className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(o)} aria-label={canEdit ? 'Editar parecer' : 'Visualizar parecer'}>
                              <Pencil />
                            </Button>
                            {can('opinions', 'delete') && o.status !== 'completed' && (
                              <ConfirmDialog
                                trigger={
                                  <Button variant="ghost" size="icon-sm" aria-label="Excluir parecer">
                                    <Trash2 />
                                  </Button>
                                }
                                title="Excluir parecer?"
                                description="O parecer não concluído será excluído. A operação é registrada na auditoria."
                                confirmLabel="Excluir"
                                onConfirm={() => remove.run(o.id)}
                              />
                            )}
                          </div>
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </QueryState>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <OpinionSheet opinion={editing === 'new' ? null : editing} readOnly={editing !== 'new' && !canEdit} defaultCommitteeId={committeeId} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  )
}

function OpinionSheet({ opinion, readOnly, defaultCommitteeId, onDone }: { opinion: Opinion | null; readOnly: boolean; defaultCommitteeId: string; onDone: () => void }) {
  const lk = useLookups()
  const propositionsQ = useCollection('propositions')
  const [propositionId, setPropositionId] = useState(opinion?.propositionId ?? '')
  const [committeeId, setCommitteeId] = useState(opinion?.committeeId ?? defaultCommitteeId)
  const [rapporteurId, setRapporteurId] = useState(opinion?.rapporteurId ?? '')
  const [dueDate, setDueDate] = useState(opinion?.dueDate ?? new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10))
  const [report, setReport] = useState(opinion?.report ?? '')
  const [reasoning, setReasoning] = useState(opinion?.reasoning ?? '')
  const [conclusion, setConclusion] = useState<OpinionConclusion | ''>(opinion?.conclusion ?? '')
  const [status, setStatus] = useState<OpinionStatus>(opinion?.status ?? 'pending')
  const [attachments, setAttachments] = useState<DocumentRef[]>(opinion?.attachments ?? [])

  const committee = lk.committees.get(committeeId)
  const members = (committee?.memberIds ?? []).map((id) => lk.councilors.get(id)).filter((c) => !!c)
  useEffect(() => {
    if (committee && rapporteurId && !committee.memberIds.includes(rapporteurId)) setRapporteurId('')
  }, [committee, rapporteurId])

  const candidates = (propositionsQ.data ?? []).filter((p) => p.id === propositionId || !['archived', 'withdrawn', 'draft'].includes(p.status))
  const completing = status === 'completed'
  const errors = {
    proposition: !propositionId,
    committee: !committeeId,
    rapporteur: !rapporteurId,
    conclusion: completing && !conclusion,
    content: completing && (report.trim().length < 20 || reasoning.trim().length < 20),
  }
  const valid = !Object.values(errors).some(Boolean)

  const save = useAction(opinionService.save, { success: completing ? 'Parecer emitido com sucesso.' : 'Parecer salvo com sucesso.', onSuccess: onDone })

  return (
    <SheetContent
      title={opinion ? (readOnly ? 'Parecer' : 'Editar parecer') : 'Novo parecer'}
      description={opinion ? `${lk.committees.get(opinion.committeeId)?.acronym ?? ''} · Relator: ${lk.councilorName(opinion.rapporteurId)}` : 'Distribua a matéria e registre o parecer do relator.'}
      footer={
        readOnly ? (
          <Button variant="outline" onClick={onDone}>
            Fechar
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onDone}>
              Cancelar
            </Button>
            <Button
              disabled={!valid}
              loading={save.pending}
              onClick={() =>
                save.run({
                  id: opinion?.id,
                  propositionId,
                  committeeId,
                  rapporteurId,
                  dueDate,
                  report: report.trim(),
                  reasoning: reasoning.trim(),
                  conclusion: conclusion || null,
                  status,
                  attachments,
                })
              }
            >
              <Save /> {completing && opinion?.status !== 'completed' ? 'Emitir parecer' : 'Salvar'}
            </Button>
          </>
        )
      }
    >
      <fieldset disabled={readOnly} className="grid gap-4">
        <Field label="Matéria" required error={errors.proposition && !readOnly ? 'Selecione a matéria.' : undefined}>
          {(id) => (
            <NativeSelect id={id} value={propositionId} onChange={(e) => setPropositionId(e.target.value)} disabled={!!opinion || readOnly}>
              <option value="">— Selecione —</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {lk.code(p)} — {p.summary.slice(0, 70)}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Comissão" required>
            {(id) => (
              <NativeSelect id={id} value={committeeId} onChange={(e) => setCommitteeId(e.target.value)} disabled={!!opinion || readOnly}>
                <option value="">— Selecione —</option>
                {[...lk.committees.values()].map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.acronym} — {c.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Relator" required>
            {(id) => (
              <NativeSelect id={id} value={rapporteurId} onChange={(e) => setRapporteurId(e.target.value)} disabled={!committeeId || readOnly}>
                <option value="">— Selecione —</option>
                {members.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parliamentaryName}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Prazo">
            {(id) => <Input id={id} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
          </Field>
          <Field label="Situação" required>
            {(id) => (
              <NativeSelect id={id} value={status} onChange={(e) => setStatus(e.target.value as OpinionStatus)} disabled={opinion?.status === 'completed' || readOnly}>
                {Object.entries(OpinionStatusMeta).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        </div>
        <Field label="Relatório" required={completing}>
          {(id) => <Textarea id={id} rows={5} value={report} onChange={(e) => setReport(e.target.value)} placeholder="Síntese da matéria e de sua tramitação na comissão." />}
        </Field>
        <Field label="Fundamentação / voto do relator" required={completing}>
          {(id) => <Textarea id={id} rows={6} value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder="Análise de constitucionalidade, legalidade e mérito." />}
        </Field>
        <Field label="Conclusão" required={completing} error={errors.conclusion && !readOnly ? 'Informe a conclusão para emitir o parecer.' : undefined}>
          {(id) => (
            <NativeSelect id={id} value={conclusion} onChange={(e) => setConclusion(e.target.value as OpinionConclusion | '')}>
              <option value="">— Não definida —</option>
              {Object.entries(OpinionConclusionMeta).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        {errors.content && !readOnly && <Alert tone="warning">Para concluir o parecer, relatório e fundamentação devem ter ao menos 20 caracteres.</Alert>}
        <div className="space-y-3">
          <p className="text-sm font-medium">Anexos</p>
          {!readOnly && <FileUpload onFiles={(files) => setAttachments((a) => [...a, ...files.map((f) => fileToDocumentRef(f, 'opinion'))])} />}
          <DocumentList documents={attachments} onRemove={readOnly ? undefined : (id) => setAttachments((a) => a.filter((d) => d.id !== id))} />
        </div>
      </fieldset>
    </SheetContent>
  )
}
