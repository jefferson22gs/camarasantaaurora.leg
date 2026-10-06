import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, FileWarning, Gauge, UserCheck, UserX, Users, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, Avatar, Card, StatusBadge, Tooltip } from '@/components/ui/display'
import { Dialog, DialogContent } from '@/components/ui/overlay'
import { Field, NativeSelect, Textarea } from '@/components/ui/form-controls'
import { StatCard } from '@/components/common/page'
import { EmptyState, TableSkeleton } from '@/components/common/states'
import { useAction, useCollection, useLookups, useOrganization, usePermission, useSettings } from '@/hooks/useData'
import { attendanceService } from '@/services/plenaryService'
import { getDeliberationQuorum } from '@/domain/quorum/quorumEngine'
import { AttendanceStatusMeta } from '@/domain/labels'
import { useAuthStore } from '@/stores/authStore'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AttendanceStatus, Councilor, Session } from '@/types'
import { isSessionActive, isSessionFinished } from '@/features/sessions/utils'

const SUCCESS: Record<AttendanceStatus, string> = {
  present: 'Presença registrada.',
  absent: 'Ausência registrada.',
  justified: 'Ausência justificada registrada.',
  impeded: 'Impedimento registrado.',
  pending: 'Registro removido.',
}

const ACTIONS: Array<{ status: AttendanceStatus; label: string; icon: typeof UserCheck; active: string }> = [
  { status: 'present', label: 'Registrar presença', icon: UserCheck, active: 'bg-success text-white hover:bg-success/90 dark:text-background' },
  { status: 'absent', label: 'Registrar ausência', icon: UserX, active: 'bg-danger text-white hover:bg-danger/90 dark:text-background' },
  { status: 'justified', label: 'Justificar ausência', icon: FileWarning, active: 'bg-warning text-black hover:bg-warning/90' },
  { status: 'impeded', label: 'Registrar impedimento', icon: Ban, active: 'bg-violet text-white hover:bg-violet/90 dark:text-background' },
]

/** Tela operacional de controle de presença de uma sessão. */
export function AttendancePanel({ session }: { session: Session }) {
  const can = usePermission()
  const user = useAuthStore((s) => s.user)
  const { data: org } = useOrganization()
  const { data: settings } = useSettings()
  const councilors = useCollection('councilors')
  const attendance = useCollection('attendance')
  const lk = useLookups()
  const [justifyFor, setJustifyFor] = useState<Councilor | null>(null)
  const [justification, setJustification] = useState('')
  const [filter, setFilter] = useState<'all' | AttendanceStatus>('all')

  const members = useMemo(
    () => (councilors.data ?? []).filter((c) => c.status === 'active' && c.legislatureId === session.legislatureId).sort((a, b) => a.parliamentaryName.localeCompare(b.parliamentaryName, 'pt-BR')),
    [councilors.data, session.legislatureId],
  )
  const records = useMemo(() => new Map((attendance.data ?? []).filter((a) => a.sessionId === session.id).map((a) => [a.councilorId, a])), [attendance.data, session.id])
  const statusOf = (id: string): AttendanceStatus => records.get(id)?.status ?? 'pending'

  const counts = members.reduce(
    (acc, m) => {
      acc[statusOf(m.id)]++
      return acc
    },
    { present: 0, absent: 0, justified: 0, impeded: 0, pending: 0 } as Record<AttendanceStatus, number>,
  )
  const seats = Math.max(members.length, org?.councilSeats ?? 0)
  const required = settings ? getDeliberationQuorum(seats, settings.voting.deliberationQuorum) : 0
  const reached = counts.present >= required

  const operable = can('attendance', 'operate') && !isSessionFinished(session.status)
  const selfId = user?.role === 'councilor' ? user.councilorId : undefined
  const selfCanMark = !!selfId && isSessionActive(session.status) && statusOf(selfId) !== 'present'

  const setStatus = useAction(
    async (councilorId: string, status: AttendanceStatus, text?: string) => {
      await attendanceService.set(session.id, councilorId, status, text)
      return status
    },
    { success: (s) => SUCCESS[s] },
  )
  const markAll = useAction(() => attendanceService.setAll(session.id, 'present'), { success: 'Vereadores pendentes registrados como presentes.' })

  if (councilors.isLoading || attendance.isLoading) return <TableSkeleton rows={5} cols={3} />

  const visible = filter === 'all' ? members : members.filter((m) => statusOf(m.id) === filter)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Presentes" value={counts.present} icon={UserCheck} tone="success" />
        <StatCard label="Ausentes" value={counts.absent + counts.justified} icon={UserX} tone="danger" hint={counts.justified ? `${counts.justified} justificada(s)` : undefined} />
        <StatCard label="Total" value={members.length} icon={Users} tone="neutral" hint={counts.pending ? `${counts.pending} sem registro` : counts.impeded ? `${counts.impeded} impedido(s)` : undefined} />
        <StatCard label="Quórum necessário" value={required} icon={Gauge} tone="info" hint="Quórum de deliberação" />
        <StatCard
          label="Quórum atual"
          value={
            <span className={cn('inline-flex items-center gap-1.5', reached ? 'text-success' : 'text-danger')}>
              {counts.present}
              <span className="text-sm font-semibold">{reached ? 'Atingido' : 'Não atingido'}</span>
            </span>
          }
          icon={reached ? CheckCircle2 : XCircle}
          tone={reached ? 'success' : 'danger'}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {!reached && isSessionActive(session.status) && (
        <Alert tone="warning" title="Quórum de deliberação não atingido">
          São necessários {required} vereadores presentes; registrados {counts.present}. Votações podem ser bloqueadas conforme configuração.
        </Alert>
      )}

      {selfCanMark && selfId && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-medium">Sua presença ainda não foi registrada nesta sessão.</p>
          <Button size="lg" onClick={() => setStatus.run(selfId, 'present')} loading={setStatus.pending}>
            <UserCheck /> Registrar minha presença
          </Button>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value as 'all' | AttendanceStatus)} className="w-auto min-w-48" aria-label="Filtrar por situação">
          <option value="all">Todos ({members.length})</option>
          {(Object.keys(AttendanceStatusMeta) as AttendanceStatus[]).map((s) => (
            <option key={s} value={s}>
              {AttendanceStatusMeta[s].label} ({counts[s]})
            </option>
          ))}
        </NativeSelect>
        {operable && counts.pending > 0 && (
          <Button variant="outline" onClick={() => markAll.run()} loading={markAll.pending}>
            <UserCheck /> Marcar pendentes como presentes
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum vereador nesta situação" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => {
            const status = statusOf(c.id)
            const record = records.get(c.id)
            const party = lk.parties.get(c.partyId)
            return (
              <li key={c.id}>
                <Card className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.parliamentaryName} src={c.photoUrl} color={party?.color} className="size-11" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.parliamentaryName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {party?.acronym ?? '—'}
                        {record?.registeredAt && status !== 'pending' ? ` · ${formatTime(record.registeredAt)}` : ''}
                      </p>
                    </div>
                    <StatusBadge meta={AttendanceStatusMeta[status]} />
                  </div>
                  {record?.justification && <p className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">{record.justification}</p>}
                  {operable && (
                    <div className="mt-auto grid grid-cols-4 gap-1.5" role="group" aria-label={`Ações de presença — ${c.parliamentaryName}`}>
                      {ACTIONS.map((a) => (
                        <Tooltip key={a.status} content={a.label}>
                          <Button
                            variant="outline"
                            className={cn('h-10 w-full', status === a.status && a.active)}
                            aria-pressed={status === a.status}
                            aria-label={`${a.label} — ${c.parliamentaryName}`}
                            disabled={setStatus.pending}
                            onClick={() => {
                              if (a.status === 'justified') {
                                setJustification(record?.justification ?? '')
                                setJustifyFor(c)
                              } else setStatus.run(c.id, a.status)
                            }}
                          >
                            <a.icon />
                          </Button>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={!!justifyFor} onOpenChange={(o) => !o && setJustifyFor(null)}>
        {justifyFor && (
          <DialogContent
            title="Justificar ausência"
            description={justifyFor.parliamentaryName}
            size="sm"
            footer={
              <>
                <Button variant="outline" onClick={() => setJustifyFor(null)}>
                  Cancelar
                </Button>
                <Button
                  disabled={justification.trim().length < 5}
                  loading={setStatus.pending}
                  onClick={async () => {
                    await setStatus.run(justifyFor.id, 'justified', justification.trim())
                    setJustifyFor(null)
                  }}
                >
                  Registrar justificativa
                </Button>
              </>
            }
          >
            <Field label="Justificativa" required hint="Mínimo de 5 caracteres. Registrada na auditoria.">
              {(id, describedBy) => <Textarea id={id} aria-describedby={describedBy} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Ex.: atestado médico apresentado à Secretaria." autoFocus />}
            </Field>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
