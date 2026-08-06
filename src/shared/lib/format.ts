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
