import { formatMoney } from '@/shared/lib/format';
import { sortCurrencies, type CurrencyTotals } from '@/shared/lib/money';
import type { Consolidated } from '@/domain/finance/fx';
import { cn } from '@/shared/lib/utils';

/** Importes de varias monedas, uno por línea: nunca se suman entre sí. */
export function MoneyByCurrency({
  totals,
  className,
  empty = '—',
}: {
  totals: CurrencyTotals;
  className?: string;
  empty?: string;
}) {
  const entries = sortCurrencies(Object.keys(totals)).filter((c) => totals[c] !== 0);
  if (entries.length === 0)
    return <span className={cn('tabular text-muted-foreground', className)}>{empty}</span>;
  return (
    <span className={cn('flex flex-col', className)}>
      {entries.map((c) => (
        <span key={c} className="tabular">
          {formatMoney(totals[c] ?? 0, c)}
        </span>
      ))}
    </span>
  );
}

/** Total consolidado en COP con la fecha de la tasa y advertencias de completitud. */
export function ConsolidatedNote({ consolidated }: { consolidated: Consolidated }) {
  const multi = consolidated.lines.some((l) => l.currency !== consolidated.target);
  if (!multi) return null;
  return (
    <p className="text-xs text-muted-foreground">
      ≈ {formatMoney(consolidated.total, consolidated.target)} consolidado
      {consolidated.oldestRateDate && ` · tasa del ${consolidated.oldestRateDate}`}
      {consolidated.hasStaleRate && ' (desactualizada)'}
      {!consolidated.complete && ` · no incluye ${consolidated.missingCurrencies.join(', ')} (falta la tasa)`}
    </p>
  );
}
