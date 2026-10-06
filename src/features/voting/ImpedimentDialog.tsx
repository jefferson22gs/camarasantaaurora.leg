import { useState } from 'react'
import { Ban, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/display'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/overlay'
import { Field, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { FileUpload } from '@/components/common/page'
import { useAction, useLookups } from '@/hooks/useData'
import { impedimentService } from '@/services/plenaryService'
import { formatDateTimeShort } from '@/lib/format'
import type { Councilor, Impediment } from '@/types'

/** Registro de impedimento/suspeição para a matéria em apreciação. */
export function ImpedimentDialog({ propositionId, members, impediments, disabled }: { propositionId: string; members: Councilor[]; impediments: Impediment[]; disabled?: boolean }) {
  const lk = useLookups()
  const [open, setOpen] = useState(false)
  const [councilorId, setCouncilorId] = useState('')
  const [kind, setKind] = useState<Impediment['kind']>('impediment')
  const [reason, setReason] = useState('')
  const [documentName, setDocumentName] = useState<string>()
  const add = useAction(impedimentService.add, {
    success: 'Impedimento registrado. O vereador foi retirado da lista de aptos desta matéria.',
    onSuccess: () => {
      setCouncilorId('')
      setReason('')
      setDocumentName(undefined)
    },
  })
  const remove = useAction(impedimentService.remove, { success: 'Impedimento removido.' })
  const available = members.filter((m) => !impediments.some((i) => i.councilorId === m.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Ban /> Impedimentos {impediments.length > 0 && <Badge tone="accent">{impediments.length}</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Impedimento e suspeição"
        description="O vereador impedido é retirado automaticamente da relação de votantes desta matéria. Registros posteriores à abertura valem para a próxima rodada."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => add.run({ councilorId, propositionId, kind, reason: reason.trim(), documentName })} loading={add.pending} disabled={!councilorId || reason.trim().length < 5}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vereador" required>
            {(id) => (
              <NativeSelect id={id} value={councilorId} onChange={(e) => setCouncilorId(e.target.value)}>
                <option value="">Selecione…</option>
                {available.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.parliamentaryName}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Tipo" required>
            {(id) => (
              <NativeSelect id={id} value={kind} onChange={(e) => setKind(e.target.value as Impediment['kind'])}>
                <option value="impediment">Impedimento</option>
                <option value="suspicion">Suspeição</option>
              </NativeSelect>
            )}
          </Field>
          <Field label="Motivo" required className="sm:col-span-2">
            {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: interesse pessoal na matéria (art. 52 do Regimento Interno)" />}
          </Field>
          <div className="sm:col-span-2">
            <FileUpload multiple={false} label={documentName ?? 'Documento comprobatório (opcional)'} onFiles={(f) => setDocumentName(f[0]?.name)} />
          </div>
        </div>
        {impediments.length > 0 && (
          <ul className="mt-5 divide-y rounded-lg border">
            {impediments.map((i) => (
              <li key={i.id} className="flex items-start gap-3 p-3">
                <Badge tone="accent">IMPEDIDO</Badge>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{lk.councilorName(i.councilorId)}</p>
                  <p className="text-muted-foreground">{i.reason}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {i.kind === 'suspicion' ? 'Suspeição' : 'Impedimento'} · {i.registeredBy} · {formatDateTimeShort(i.registeredAt)}
                    {i.documentName && ` · ${i.documentName}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => remove.run(i.id)} aria-label={`Remover impedimento de ${lk.councilorName(i.councilorId)}`} disabled={disabled}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
