import { monthStart, weekStart, type IsoDate } from '@/shared/lib/dates';

/**
 * Acciones que el usuario confirma explícitamente (no se pueden deducir de
 * los datos). Cada una se guarda una vez por periodo en user_checkins.
 */
export const CHECKINS = {
  weekly_review: {
    label: 'Revisión semanal',
    description: 'Revisé mis movimientos y mi dinero disponible de la semana.',
    period: 'week',
  },
  obligations_review: {
    label: 'Revisión de próximos pagos',
    description: 'Revisé las obligaciones que vencen en las próximas semanas.',
    period: 'week',
  },
  monthly_close: {
    label: 'Cierre mensual',
    description: 'Revisé cómo terminó el mes: ingresos, gastos, deudas y metas.',
    period: 'month',
  },
  subscriptions_review: {
    label: 'Revisión de suscripciones',
    description: 'Revisé mis suscripciones y gastos recurrentes.',
    period: 'month',
  },
  debts_inventory: {
    label: 'Inventario de deudas',
    description: 'Confirmo que todas mis deudas están registradas en Finance.',
    period: 'month',
  },
  'plan.no_new_commitments': {
    label: 'Sin compromisos nuevos',
    description: 'Este mes no asumí compromisos financieros nuevos sin analizarlos.',
    period: 'month',
  },
  'plan.calendar': {
    label: 'Calendario financiero',
    description: 'Revisé el calendario de pagos y fechas del mes.',
    period: 'month',
  },
  'plan.risk_profile': {
    label: 'Perfil de riesgo',
    description: 'Definí mi tolerancia al riesgo antes de evaluar inversiones.',
    period: 'month',
  },
} as const satisfies Record<string, { label: string; description: string; period: 'week' | 'month' }>;

export type CheckinKey = keyof typeof CHECKINS;

export function isCheckinKey(value: string): value is CheckinKey {
  return Object.prototype.hasOwnProperty.call(CHECKINS, value);
}

export function checkinPeriodStart(key: CheckinKey, date: IsoDate): IsoDate {
  return CHECKINS[key].period === 'week' ? weekStart(date) : monthStart(date);
}
