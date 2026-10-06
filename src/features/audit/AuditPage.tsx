import { useMemo, useState } from 'react'
import { Download, Eye, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, Badge, Card, DescriptionList, Table, TBody, TD, TH, THead, TR } from '@/components/ui/display'
import { DatePicker, NativeSelect } from '@/components/ui/form-controls'
import { Dialog, SheetContent } from '@/components/ui/overlay'
import { PageHeader, Pagination, SearchInput, Toolbar, usePagination } from '@/components/common/page'
import { EmptyState, QueryState } from '@/components/common/states'
import { useCollection, usePermission } from '@/hooks/useData'
import { ALL_MODULES, ROLES } from '@/domain/auth/permissions'
import { downloadFile, toCsv, type CsvColumn } from '@/lib/csv'
import { formatDateTime } from '@/lib/format'
import { matches } from '@/lib/utils'
import type { AuditLog, AuditOrigin, RoleKey } from '@/types'

const ORIGIN_LABEL: Record<AuditOrigin, string> = { web: 'Web', tablet: 'Tablet', panel: 'Painel', system: 'Sistema' }
const MODULE_LABEL: Record<string, string> = { ...Object.fromEntries(ALL_MODULES.map((m) => [m.key, m.label])), auth: 'Autenticação', system: 'Sistema' }
const roleLabel = (r: AuditLog['role']) => (r === 'system' ? 'Sistema' : ROLES[r].name)

const CSV_COLUMNS: CsvColumn<AuditLog>[] = [
  { header: 'Data/Hora', value: (l) => formatDateTime(l.at) },
  { header: 'Usuário', value: (l) => l.userName },
  { header: 'Perfil', value: (l) => roleLabel(l.role) },
  { header: 'Operação', value: (l) => l.operation },
  { header: 'Módulo', value: (l) => MODULE_LABEL[l.module] ?? l.module },
  { header: 'Registro', value: (l) => l.recordLabel },
  { header: 'Origem', value: (l) => ORIGIN_LABEL[l.origin] },
  { header: 'Detalhes', value: (l) => l.details },
  { header: 'Situação anterior', value: (l) => l.before },
  { header: 'Situação posterior', value: (l) => l.after },
  { header: 'Dispositivo', value: (l) => l.device },
  { header: 'IP', value: (l) => l.ip },
]

export default function AuditPage() {
  const query = useCollection('auditLogs')
  const can = usePermission()
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [role, setRole] = useState('')
  const [origin, setOrigin] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const rows = useMemo(
    () =>
      (query.data ?? [])
        .filter(
          (l) =>
            (!module || l.module === module) &&
            (!role || l.role === role) &&
            (!origin || l.origin === origin) &&
            (!from || l.at.slice(0, 10) >= from) &&
            (!to || l.at.slice(0, 10) <= to) &&
            matches([l.userName, l.operation, l.recordLabel, l.details, l.notes], search),
        )
        .sort((a, b) => b.at.localeCompare(a.at)),
    [query.data, module, role, origin, from, to, search],
  )
  const pagination = usePagination(rows, 15)

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Início', to: '/admin/dashboard' }, { label: 'Auditoria' }]}
        title="Auditoria"
        description="Trilha das operações relevantes: usuário, data/hora, operação, registro afetado e situação anterior/posterior."
        actions={
          can('audit', 'export') && (
            <Button
              variant="outline"
              disabled={!rows.length}
              onClick={() => {
                downloadFile(`auditoria-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(CSV_COLUMNS, rows))
                toast.success('Auditoria exportada em CSV.')
              }}
            >
              <Download /> Exportar CSV
            </Button>
          )
        }
      />
      <Alert tone="warning" className="mb-5" title="Registro demonstrativo">
        Nesta fase os logs são gerados no navegador. Em produção a auditoria deve ser gravada pelo backend em trilha imutável (append-only), com IP e dispositivo reais, e protegida contra alteração.
      </Alert>
      <Card>
        <Toolbar className="grid grid-cols-2 gap-2 sm:flex">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar usuário, operação, registro…" className="col-span-2" />
          <NativeSelect value={module} onChange={(e) => setModule(e.target.value)} aria-label="Módulo" className="sm:w-44">
            <option value="">Todos os módulos</option>
            {Object.entries(MODULE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value)} aria-label="Perfil" className="sm:w-44">
            <option value="">Todos os perfis</option>
            {(Object.keys(ROLES) as RoleKey[]).map((r) => (
              <option key={r} value={r}>
                {ROLES[r].name}
              </option>
            ))}
            <option value="system">Sistema</option>
          </NativeSelect>
          <NativeSelect value={origin} onChange={(e) => setOrigin(e.target.value)} aria-label="Origem" className="sm:w-36">
            <option value="">Todas as origens</option>
            {Object.entries(ORIGIN_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
          <DatePicker value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" className="sm:w-40" />
          <DatePicker value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" className="sm:w-40" />
        </Toolbar>
        <QueryState query={query} isEmpty={() => rows.length === 0} empty={<EmptyState icon={History} title="Nenhum registro de auditoria" description="Ajuste os filtros para ampliar a busca." />}>
          {() => (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Data/Hora</TH>
                    <TH>Usuário</TH>
                    <TH>Perfil</TH>
                    <TH>Operação</TH>
                    <TH>Módulo</TH>
                    <TH>Registro</TH>
                    <TH>Origem</TH>
                    <TH>Detalhes</TH>
                    <TH>
                      <span className="sr-only">Ações</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {pagination.slice.map((l) => (
                    <TR key={l.id}>
                      <TD className="whitespace-nowrap tabular text-xs">{formatDateTime(l.at)}</TD>
                      <TD className="whitespace-nowrap font-medium">{l.userName}</TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{roleLabel(l.role)}</TD>
                      <TD className="whitespace-nowrap">{l.operation}</TD>
                      <TD>
                        <Badge>{MODULE_LABEL[l.module] ?? l.module}</Badge>
                      </TD>
                      <TD className="min-w-40">{l.recordLabel}</TD>
                      <TD>
                        <Badge tone={l.origin === 'tablet' ? 'accent' : l.origin === 'system' ? 'neutral' : 'info'}>{ORIGIN_LABEL[l.origin]}</Badge>
                      </TD>
                      <TD className="max-w-72 truncate text-muted-foreground" title={l.details}>
                        {l.details}
                      </TD>
                      <TD>
                        <Button variant="ghost" size="icon-sm" onClick={() => setSelected(l)} aria-label="Ver detalhes">
                          <Eye />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </QueryState>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <SheetContent title={selected.operation} description={formatDateTime(selected.at)}>
            <DescriptionList
              columns={1}
              items={[
                { label: 'Usuário', value: `${selected.userName} (${roleLabel(selected.role)})` },
                { label: 'Módulo', value: MODULE_LABEL[selected.module] ?? selected.module },
                { label: 'Registro', value: `${selected.recordLabel}${selected.recordId ? ` · ${selected.recordId}` : ''}` },
                { label: 'Detalhes', value: selected.details },
                { label: 'Situação anterior', value: selected.before ?? '—' },
                { label: 'Situação posterior', value: selected.after ?? '—' },
                { label: 'Origem', value: ORIGIN_LABEL[selected.origin] },
                { label: 'Dispositivo', value: selected.device },
                { label: 'IP (simulado)', value: selected.ip },
                { label: 'Observação', value: selected.notes ?? '—' },
              ]}
            />
          </SheetContent>
        )}
      </Dialog>
    </>
  )
}
