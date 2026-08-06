import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

export interface KpiCardProps {
  label: string;
  amount: number;
  currency?: string;
  icon: LucideIcon;
  /** % de cambio vs. periodo anterior. Positivo = verde, negativo = rojo. undefined = sin dato. */
  trend?: number;
  tone?: 'default' | 'success' | 'danger';
}

/**
 * Tarjeta de KPI reutilizada en Dashboard, Reportes y Cuentas. En Fase 6 se
 * conecta a `useDashboardSummary()` (React Query) en vez de recibir props estáticas.
 */
export function KpiCard({ label, amount, currency = 'COP', icon: Icon, trend, tone = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            'tabular text-2xl font-semibold',
            tone === 'success' && 'text-success',
            tone === 'danger' && 'text-danger'
          )}
        >
          {formatMoney(amount, currency)}
        </p>
        {trend !== undefined && (
          <p
            className={cn(
              'mt-1 flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(trend).toFixed(1)}% vs. mes anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
