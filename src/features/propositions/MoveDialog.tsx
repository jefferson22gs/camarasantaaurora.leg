import { useEffect, useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { DocumentList, FileUpload } from '@/components/common/page'
import { useAction, useCollection, useSettings } from '@/hooks/useData'
import { PropositionStatusMeta } from '@/domain/labels'
import { isStageApplicable } from '@/domain/legislative/process'
import { fileToDocumentRef, propositionService, STAGE_DEFAULT_STATUS } from '@/services/propositionService'
import type { DocumentRef, ProcessStage, Proposition, PropositionStatus } from '@/types'

const DEFAULT_ACTION: Partial<Record<ProcessStage, string>> = {
  protocol: 'Protocolo e autuação',
  analysis: 'Análise de admissibilidade',
  referral: 'Despacho às comissões',
  committee: 'Distribuição ao relator',
  opinion: 'Parecer emitido',
  agenda: 'Inclusão em pauta',
  order_of_day: 'Leitura na Ordem do Dia',
  discussion: 'Discussão em Plenário',
  voting: 'Votação em Plenário',
  result: 'Proclamação do resultado',
  sanction_veto: 'Remessa do autógrafo ao Executivo',
  promulgation: 'Promulgação',
  publication: 'Publicação no Diário Oficial',
  archiving: 'Arquivamento',
}

/** Dialog de tramitação: registra movimentação e atualiza etapa/situação da proposição. */
export function MoveDialog({ proposition, open, onOpenChange }: { proposition: Proposition; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: settings } = useSettings()
  const committees = useCollection('committees')
  const councilors = useCollection('councilors')
  const type = settings?.propositionTypes.find((t) => t.id === proposition.typeId)
  const stages = useMemo(() => (settings?.processFlow ?? []).filter((s) => s.enabled && isStageApplicable(s.key, type)), [settings, type])

  const nextStage = useMemo(() => {
    const i = stages.findIndex((s) => s.key === proposition.stage)
    return stages[Math.min(stages.length - 1, i + 1)]?.key ?? proposition.stage
  }, [stages, proposition.stage])

  const [stage, setStage] = useState<ProcessStage>(nextStage)
  const [to, setTo] = useState('')
  const [action, setAction] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<PropositionStatus>(proposition.status)
  const [committeeId, setCommitteeId] = useState('')
  const [rapporteurId, setRapporteurId] = useState('')
  const [documents, setDocuments] = useState<DocumentRef[]>([])

  function applyStage(s: ProcessStage) {
    setStage(s)
    setTo(stages.find((x) => x.key === s)?.unit ?? '')
    setAction(DEFAULT_ACTION[s] ?? '')
    setStatus(STAGE_DEFAULT_STATUS[s] ?? proposition.status)
  }

  useEffect(() => {
    if (!open) return
    applyStage(nextStage)
    setNotes('')
    setCommitteeId('')
    setRapporteurId('')
    setDocuments([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nextStage])

  const committee = committees.data?.find((c) => c.id === committeeId)
  const members = (councilors.data ?? []).filter((c) => committee?.memberIds.includes(c.id))
  const isCommitteeStage = stage === 'committee' || stage === 'referral'

  const { run, pending } = useAction(propositionService.move, { success: 'Tramitação registrada com sucesso.', onSuccess: () => onOpenChange(false) })

  const valid = to.trim().length > 1 && action.trim().length > 2 && (!committeeId || !!rapporteurId || stage !== 'committee')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title="Tramitar proposição"
        description="A movimentação será registrada no histórico do processo e na auditoria."
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              loading={pending}
              disabled={!valid}
              onClick={() =>
                run({
                  propositionId: proposition.id,
                  stage,
                  to: to.trim(),
                  action: action.trim(),
                  notes: notes.trim(),
                  status,
                  documents,
                  committeeId: committeeId || undefined,
                  rapporteurId: rapporteurId || undefined,
                })
              }
            >
              <Send /> Registrar tramitação
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Etapa de destino" required>
            {(id) => (
              <NativeSelect id={id} value={stage} onChange={(e) => applyStage(e.target.value as ProcessStage)}>
                {stages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Destino / unidade" required>
            {(id) => <Input id={id} value={to} onChange={(e) => setTo(e.target.value)} />}
          </Field>
          <Field label="Ação" required className="sm:col-span-2">
            {(id) => <Input id={id} value={action} onChange={(e) => setAction(e.target.value)} />}
          </Field>
          <Field label="Situação após a tramitação">
            {(id) => (
              <NativeSelect id={id} value={status} onChange={(e) => setStatus(e.target.value as PropositionStatus)}>
                {Object.entries(PropositionStatusMeta).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          {isCommitteeStage && (
            <>
              <Field label="Comissão" hint="Opcional. Com relator, cria parecer pendente.">
                {(id, d) => (
                  <NativeSelect
                    id={id}
                    aria-describedby={d}
                    value={committeeId}
                    onChange={(e) => {
                      setCommitteeId(e.target.value)
                      setRapporteurId('')
                    }}
                  >
                    <option value="">— Não informar —</option>
                    {(committees.data ?? [])
                      .filter((c) => c.status === 'active')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.acronym} — {c.name}
                        </option>
                      ))}
                  </NativeSelect>
                )}
              </Field>
              <Field label="Relator" required={stage === 'committee' && !!committeeId}>
                {(id) => (
                  <NativeSelect id={id} value={rapporteurId} onChange={(e) => setRapporteurId(e.target.value)} disabled={!committeeId}>
                    <option value="">— Selecione —</option>
                    {members.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.parliamentaryName}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
            </>
          )}
          <Field label="Observação / despacho" className="sm:col-span-2">
            {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Despacho, fundamentação ou observações da movimentação" />}
          </Field>
          <div className="space-y-3 sm:col-span-2">
            <FileUpload onFiles={(files) => setDocuments((d) => [...d, ...files.map((f) => fileToDocumentRef(f))])} label="Anexar documentos à movimentação" />
            {documents.length > 0 && <DocumentList documents={documents} onRemove={(id) => setDocuments((d) => d.filter((x) => x.id !== id))} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
