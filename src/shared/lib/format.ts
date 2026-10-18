/**
 * Formato de dinero centralizado — todos los KPIs, tablas y reportes pasan
 * por aquí para que el formato (símbolo, decimales, separador) sea consistente
 * en toda la app y configurable por Fase 19 (Configuración → moneda/idioma).
 */
export function formatMoney(amount: number, currency: string = 'COP', locale: string = 'es-CO'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

export function formatPercent(value: number, locale: string = 'es-CO'): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
}

/**
 * Como formatMoney, pero para importes que pueden ser desconocidos (null):
 * muestra un texto explícito en vez de un 0 que aparentaría un dato real.
 */
export function formatMaybeMoney(
  amount: number | null | undefined,
  currency: string = 'COP',
  unknownLabel = 'Por confirmar',
  options: { approximate?: boolean } = {}
): string {
  if (amount === null || amount === undefined) return unknownLabel;
  return `${options.approximate ? '≈ ' : ''}${formatMoney(amount, currency)}`;
}
