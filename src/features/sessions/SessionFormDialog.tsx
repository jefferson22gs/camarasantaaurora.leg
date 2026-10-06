import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { DatePicker, Field, Input, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { useAction, useCollection, useOrganization, useSettings } from '@/hooks/useData'
import { sessionService } from '@/services/registryServices'
import { SessionStatusMeta, SessionTypeLabel } from '@/domain/labels'
import { uid } from '@/lib/utils'
import { todayISO } from '@/lib/format'
import type { Session, SessionStatus, SessionType } from '@/types'

const TYPES = Object.keys(SessionTypeLabel) as [SessionType, ...SessionType[]]
const STATUSES = Object.keys(SessionStatusMeta) as [SessionStatus, ...SessionStatus[]]

const schema = z.object({
  type: z.enum(TYPES),
  number: z.coerce.number().int().min(1, 'Informe o número.'),
  year: z.coerce.number().int().min(1990, 'Ano inválido.').max(2100, 'Ano inválido.'),
  date: z.string().min(1, 'Informe a data.'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido.'),
  legislatureId: z.string().min(1, 'Selecione a legislatura.'),
  presidentId: z.string().min(1, 'Selecione o presidente.'),
  location: z.string().trim().min(3, 'Informe o local.'),
  status: z.enum(STATUSES),
  expedient: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

export function SessionFormDialog({ open, onOpenChange, session, sessions }: { open: boolean; onOpenChange: (o: boolean) => void; session: Session | null; sessions: Session[] }) {
  const { data: settings } = useSettings()
  const { data: org } = useOrganization()
  const legislatures = useCollection('legislatures')
  const councilors = useCollection('councilors')

  const form = useForm<z.input<typeof schema>, unknown, FormValues>({ resolver: zodResolver(schema) })
  const { register, handleSubmit, reset, watch, formState } = form
  const errors = formState.errors

  const type = watch('type')
  const year = watch('year')

  useEffect(() => {
    if (!open) return
    if (session) {
      reset({ ...session })
      return
    }
    const currentYear = Number(todayISO().slice(0, 4))
    const president = councilors.data?.find((c) => c.boardRole === 'president' && c.status === 'active')
    reset({
      type: 'ordinary',
      number: sessions.filter((s) => s.type === 'ordinary' && s.year === currentYear).reduce((m, s) => Math.max(m, s.number), 0) + 1,
      year: currentYear,
      date: todayISO(),
      startTime: settings?.sessionDefaults.startTime ?? '19:00',
      legislatureId: org?.currentLegislatureId ?? '',
      presidentId: president?.id ?? '',
      location: settings?.sessionDefaults.location ?? '',
      status: 'scheduled',
      expedient: '',
      notes: '',
    })
  }, [open, session, sessions, settings, org, councilors.data, reset])

  // Sugere o próximo número ao trocar tipo/ano em uma nova sessão.
  useEffect(() => {
    if (!open || session || !type || !year) return
    const next = sessions.filter((s) => s.type === type && s.year === Number(year)).reduce((m, s) => Math.max(m, s.number), 0) + 1
    form.setValue('number', next)
  }, [type, year, open, session, sessions, form])

  const save = useAction(
    async (values: FormValues) => {
      const duplicate = sessions.some((s) => s.id !== session?.id && s.type === values.type && s.year === values.year && s.number === values.number)
      if (duplicate) throw new Error(`Já existe sessão ${SessionTypeLabel[values.type]} nº ${values.number}/${values.year}.`)
      if (session) return sessionService.update(session.id, values)
      return sessionService.create({ ...values, id: uid('ss') })
    },
    { success: session ? 'Sessão atualizada com sucesso.' : 'Sessão cadastrada com sucesso.', onSuccess: () => onOpenChange(false) },
  )

  const activeCouncilors = (councilors.data ?? []).filter((c) => c.status === 'active')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={session ? 'Editar sessão' : 'Nova sessão plenária'}
        description="Campos marcados com * são obrigatórios."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="session-form" loading={save.pending}>
              {session ? 'Salvar alterações' : 'Cadastrar sessão'}
            </Button>
          </>
        }
      >
        <form id="session-form" onSubmit={handleSubmit((v) => save.run(v))} className="grid gap-4 sm:grid-cols-6" noValidate>
          <Field label="Tipo" required error={errors.type?.message} className="sm:col-span-2">
            {(id) => (
              <NativeSelect id={id} {...register('type')}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SessionTypeLabel[t]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Número" required error={errors.number?.message} className="sm:col-span-2">
            {(id, d) => <Input id={id} type="number" min={1} aria-describedby={d} aria-invalid={!!errors.number} {...register('number')} />}
          </Field>
          <Field label="Ano" required error={errors.year?.message} className="sm:col-span-2">
            {(id, d) => <Input id={id} type="number" aria-describedby={d} aria-invalid={!!errors.year} {...register('year')} />}
          </Field>
          <Field label="Data" required error={errors.date?.message} className="sm:col-span-3">
            {(id, d) => <DatePicker id={id} aria-describedby={d} aria-invalid={!!errors.date} {...register('date')} />}
          </Field>
          <Field label="Horário" required error={errors.startTime?.message} className="sm:col-span-3">
            {(id, d) => <Input id={id} type="time" aria-describedby={d} aria-invalid={!!errors.startTime} {...register('startTime')} />}
          </Field>
          <Field label="Legislatura" required error={errors.legislatureId?.message} className="sm:col-span-3">
            {(id) => (
              <NativeSelect id={id} {...register('legislatureId')}>
                <option value="">Selecione…</option>
                {(legislatures.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Presidente da sessão" required error={errors.presidentId?.message} className="sm:col-span-3">
            {(id) => (
              <NativeSelect id={id} {...register('presidentId')}>
                <option value="">Selecione…</option>
                {activeCouncilors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parliamentaryName}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Local" required error={errors.location?.message} className="sm:col-span-4">
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.location} {...register('location')} />}
          </Field>
          <Field label="Situação" required className="sm:col-span-2">
            {(id) => (
              <NativeSelect id={id} {...register('status')}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SessionStatusMeta[s].label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field label="Expediente" hint="Leitura de atas, ofícios, comunicações e matérias apresentadas." className="sm:col-span-6">
            {(id, d) => <Textarea id={id} aria-describedby={d} {...register('expedient')} />}
          </Field>
          <Field label="Observações" className="sm:col-span-6">
            {(id) => <Textarea id={id} className="min-h-16" {...register('notes')} />}
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}
