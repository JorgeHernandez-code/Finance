'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ScorePoint {
  periodStart: string;
  score: number | null;
  rulesVersion: string;
  isFinal: boolean;
}

/** Evolución del índice. Los periodos "en construcción" quedan como huecos, no como cero. */
export function ScoreHistoryChart({
  points,
  periodType,
}: {
  points: ScorePoint[];
  periodType: 'week' | 'month';
}) {
  const data = points.map((p) => ({
    label: format(parseISO(p.periodStart), periodType === 'week' ? 'd MMM' : 'MMM yy', { locale: es }),
    score: p.score,
    version: p.rulesVersion,
    open: !p.isFinal,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 18%)" vertical={false} />
        <XAxis dataKey="label" stroke="hsl(240 5% 65%)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          domain={[0, 100]}
          stroke="hsl(240 5% 65%)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value, _name, item) => [
            value ?? 'En construcción',
            `Puntaje (reglas ${(item.payload as { version: string }).version}${(item.payload as { open: boolean }).open ? ', periodo abierto' : ''})`,
          ]}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
