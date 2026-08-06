'use client';

import Link from 'next/link';
import { Landmark, Wallet, TrendingUp, HandCoins, PiggyBank, ArrowUpCircle, ArrowDownCircle, Scale, RefreshCw } from 'lucide-react';
import { useDashboardSummary } from '@/presentation/hooks/useDashboardSummary';
import { KpiCard } from './KpiCard';
import { IncomeExpenseChart } from '@/presentation/components/charts/IncomeExpenseChart';
import { CategoryDonutChart } from '@/presentation/components/charts/CategoryDonutChart';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { cn } from '@/shared/lib/utils';
import type { DashboardSummary } from '@/domain/entities/DashboardSummary';

interface DashboardViewProps {
  userId: string;
  initialData: DashboardSummary;
}

export function DashboardView({ userId, initialData }: DashboardViewProps) {
  const { data, isFetching, refetch } = useDashboardSummary(userId, initialData);
  const hasAnyActivity = data.monthlyHistory.some((m) => m.income > 0 || m.expense > 0) || data.categoryBreakdown.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen general de tus finanzas.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          Refrescar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Patrimonio neto" amount={data.netWorth.netWorth} icon={Landmark} />
        <KpiCard label="Dinero disponible" amount={data.netWorth.available} icon={Wallet} />
        <KpiCard label="Invertido" amount={data.netWorth.invested} icon={TrendingUp} />
        <KpiCard label="Deudas" amount={data.netWorth.debt} icon={HandCoins} tone={data.netWorth.debt > 0 ? 'danger' : 'default'} />
        <KpiCard label="Ahorros" amount={data.netWorth.saved} icon={PiggyBank} />
        <KpiCard
          label="Ingresos del mes"
          amount={data.currentMonth.income}
          icon={ArrowUpCircle}
          tone="success"
          trend={data.trend.income}
        />
        <KpiCard
          label="Gastos del mes"
          amount={data.currentMonth.expense}
          icon={ArrowDownCircle}
          tone="danger"
          trend={data.trend.expense === undefined ? undefined : -data.trend.expense}
        />
        <KpiCard
          label="Balance mensual"
          amount={data.currentMonth.balance}
          icon={Scale}
          tone={data.currentMonth.balance >= 0 ? 'success' : 'danger'}
          trend={data.trend.balance}
        />
      </div>

      {hasAnyActivity ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos vs. gastos (últimos 6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeExpenseChart data={data.monthlyHistory} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gastos por categoría (este mes)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.categoryBreakdown.length > 0 ? (
                <CategoryDonutChart data={data.categoryBreakdown} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">Sin gastos categorizados este mes.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="glass rounded-lg p-8 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no hay movimientos registrados.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Los gráficos aparecen automáticamente en cuanto registres tu primera transacción en{' '}
            <Link href="/transactions" className="text-primary hover:underline">
              Transacciones
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
