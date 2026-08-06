'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatMoney } from '@/shared/lib/format';
import type { MonthlyPoint } from '@/domain/entities/DashboardSummary';

interface IncomeExpenseChartProps {
  data: MonthlyPoint[];
  currency?: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; payload: { month: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const monthIso = payload[0]?.payload?.month;
  return (
    <div className="glass rounded-md border px-3 py-2 text-xs">
      <p className="mb-1 font-medium text-foreground">{monthIso ? format(parseISO(monthIso), 'MMMM yyyy', { locale: es }) : ''}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {formatMoney(item.value)}
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const chartData = data.map((point) => ({
    month: point.month,
    label: format(parseISO(point.month), 'MMM', { locale: es }),
    Ingresos: point.income,
    Gastos: point.expense,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 18%)" vertical={false} />
        <XAxis dataKey="label" stroke="hsl(240 5% 65%)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="hsl(240 5% 65%)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(240 6% 18% / 0.4)' }} />
        <Bar dataKey="Ingresos" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
