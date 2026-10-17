/**
 * Aritmética monetaria sin errores de coma flotante.
 *
 * Postgres guarda numeric(14,2) y PostgREST lo entrega como number de JS,
 * donde 0.1 + 0.2 !== 0.3. Todas las sumas/restas de dinero del dominio
 * pasan por aquí: se opera en centavos enteros y se vuelve a unidades al final.
 */

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function sumMoney(values: Iterable<number>): number {
  let cents = 0;
  for (const value of values) cents += toCents(value);
  return fromCents(cents);
}

export function subtractMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

/** Multiplica (p. ej. por una tasa de cambio) y redondea al centavo. */
export function multiplyMoney(amount: number, factor: number): number {
  return fromCents(Math.round(amount * factor * 100));
}

export function divideMoney(amount: number, divisor: number): number {
  if (divisor === 0) throw new Error('División por cero');
  return fromCents(Math.round((amount * 100) / divisor));
}

/** Importes agrupados por moneda: nunca se suman monedas distintas. */
export type CurrencyTotals = Record<string, number>;

export function addToTotals(totals: CurrencyTotals, currency: string, amount: number): CurrencyTotals {
  totals[currency] = sumMoney([totals[currency] ?? 0, amount]);
  return totals;
}

export function totalsBy<T>(
  items: T[],
  currency: (item: T) => string,
  amount: (item: T) => number
): CurrencyTotals {
  const totals: CurrencyTotals = {};
  for (const item of items) addToTotals(totals, currency(item), amount(item));
  return totals;
}

export function mergeTotals(...all: CurrencyTotals[]): CurrencyTotals {
  const result: CurrencyTotals = {};
  for (const totals of all)
    for (const [currency, amount] of Object.entries(totals)) addToTotals(result, currency, amount);
  return result;
}

export function subtractTotals(a: CurrencyTotals, b: CurrencyTotals): CurrencyTotals {
  const result: CurrencyTotals = { ...a };
  for (const [currency, amount] of Object.entries(b)) addToTotals(result, currency, -amount);
  return result;
}

/** Monedas ordenadas: COP, CLP y luego el resto alfabéticamente. */
export function sortCurrencies(currencies: string[]): string[] {
  const rank = (c: string) => (c === 'COP' ? 0 : c === 'CLP' ? 1 : 2);
  return [...new Set(currencies)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
