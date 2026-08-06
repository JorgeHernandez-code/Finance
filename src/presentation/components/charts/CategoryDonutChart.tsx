'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '@/shared/lib/format';
import type { CategoryBreakdownItem } from '@/domain/entities/DashboardSummary';

interface CategoryDonutChartProps {
  data: CategoryBreakdownItem[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: CategoryBreakdownItem }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!;
  return (
    <div className="glass rounded-md border px-3 py-2 text-xs">
      <p className="font-medium" style={{ color: item.payload.color }}>
        {item.name}
      </p>
      <p className="text-muted-foreground">{formatMoney(item.value)}</p>
    </div>
  );
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((item) => (
              <Cell key={item.categoryId} fill={item.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="flex flex-1 flex-col gap-2 text-xs">
        {data.slice(0, 6).map((item) => (
          <li key={item.categoryId} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="tabular font-medium text-foreground">
              {total > 0 ? Math.round((item.total / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
