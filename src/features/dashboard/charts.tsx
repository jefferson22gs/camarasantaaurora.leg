import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/display'
import { EmptyState } from '@/components/common/states'
import { BarChart3 } from 'lucide-react'

/** Paleta dos gráficos baseada nos tokens do design system (funciona em light/dark). */
export const CHART_COLORS = ['var(--brand)', 'var(--brand-2)', 'var(--success)', 'var(--info)', 'var(--violet)', 'var(--warning)', 'var(--danger)', 'var(--muted-foreground)']

export const tooltipStyle = {
  contentStyle: {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--foreground)',
    fontSize: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  labelStyle: { color: 'var(--foreground)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'var(--foreground)' },
  cursor: { fill: 'color-mix(in oklch, var(--muted-foreground) 12%, transparent)' },
}

export const axisProps = {
  tick: { fill: 'var(--muted-foreground)', fontSize: 11 },
  stroke: 'var(--border)',
  tickLine: false,
}

export function ChartCard({ title, description, children, empty, className }: { title: string; description?: string; children: ReactNode; empty?: boolean; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className="h-72 p-3 sm:p-5">{empty ? <EmptyState icon={BarChart3} title="Sem dados para os filtros" className="py-10" /> : children}</CardContent>
    </Card>
  )
}
