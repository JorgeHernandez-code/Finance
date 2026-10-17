import { multiplyMoney, sumMoney, sortCurrencies, type CurrencyTotals } from '@/shared/lib/money';
import { daysBetween, type IsoDate } from '@/shared/lib/dates';
import type { SnapshotRate } from './snapshot';

/** Una tasa con más días que esto se muestra como desactualizada (no se descarta). */
export const STALE_RATE_DAYS = 7;

export interface ResolvedRate {
  rate: number;
  date: IsoDate;
  /** true si se usó la inversa de una tasa registrada en el otro sentido. */
  inverted: boolean;
}

/** Tasa más reciente (en o antes de `asOf`) para convertir `from` → `to`. */
export function findRate(
  rates: SnapshotRate[],
  from: string,
  to: string,
  asOf?: IsoDate
): ResolvedRate | null {
  if (from === to) return { rate: 1, date: asOf ?? '', inverted: false };
  let best: ResolvedRate | null = null;
  for (const r of rates) {
    if (asOf && r.date > asOf) continue;
    let candidate: ResolvedRate | null = null;
    if (r.base === from && r.quote === to) candidate = { rate: r.rate, date: r.date, inverted: false };
    else if (r.base === to && r.quote === from)
      candidate = { rate: 1 / r.rate, date: r.date, inverted: true };
    if (!candidate) continue;
    // Misma fecha: preferir la tasa directa sobre la inversa.
    if (
      !best ||
      candidate.date > best.date ||
      (candidate.date === best.date && best.inverted && !candidate.inverted)
    ) {
      best = candidate;
    }
  }
  return best;
}

export interface ConversionLine {
  currency: string;
  amount: number;
  rate: ResolvedRate | null;
  converted: number | null;
}

export interface Consolidated {
  target: string;
  /** Suma solo de lo convertible. `complete` dice si incluye todo. */
  total: number;
  complete: boolean;
  lines: ConversionLine[];
  missingCurrencies: string[];
  /** Fecha de la tasa más antigua utilizada (para mostrarla). */
  oldestRateDate: IsoDate | null;
  hasStaleRate: boolean;
}

/**
 * Consolida importes por moneda en `target` SOLO con tasas registradas.
 * Si falta una tasa, esa moneda queda fuera y `complete = false`: nunca se
 * suma 1 CLP como si fuera 1 COP.
 */
export function consolidate(
  totals: CurrencyTotals,
  target: string,
  rates: SnapshotRate[],
  today: IsoDate
): Consolidated {
  const lines: ConversionLine[] = sortCurrencies(Object.keys(totals))
    .map((currency) => ({ currency, amount: totals[currency] ?? 0 }))
    .filter(({ amount }) => amount !== 0)
    .map(({ currency, amount }) => {
      const rate = findRate(rates, currency, target, today);
      return { currency, amount, rate, converted: rate ? multiplyMoney(amount, rate.rate) : null };
    });

  const usedDates = lines.filter((l) => l.currency !== target && l.rate).map((l) => l.rate!.date);
  const oldestRateDate = usedDates.length ? usedDates.reduce((a, b) => (a < b ? a : b)) : null;
  const missingCurrencies = lines.filter((l) => l.converted === null).map((l) => l.currency);

  return {
    target,
    total: sumMoney(lines.map((l) => l.converted ?? 0)),
    complete: missingCurrencies.length === 0,
    lines,
    missingCurrencies,
    oldestRateDate,
    hasStaleRate: oldestRateDate !== null && daysBetween(oldestRateDate, today) > STALE_RATE_DAYS,
  };
}
