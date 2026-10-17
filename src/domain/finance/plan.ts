/**
 * Mi Plan Financiero: seis etapas evaluadas con los datos reales.
 *
 * Cada objetivo es "hecho", "pendiente" o "no aplica" con la evidencia que
 * lo justifica. La etapa actual es la primera con objetivos pendientes. No
 * se recomiendan inversiones mientras no se cumplan las condiciones de la
 * etapa 6, y no se asume capacidad de ahorro positiva.
 */
import type { Route } from 'next';
import { addDaysIso, daysBetween, monthStart, type IsoDate } from '@/shared/lib/dates';
import { sumMoney } from '@/shared/lib/money';
import {
  monthlyAverages,
  monthlyCapacity,
  monthlyCommitments,
  completeMonthsWithData,
  type Capacity,
} from './cashflow';
import { agreedDate, isBalanceConfirmed, isOpenDebt, toDebtView } from './debts';
import { isAccountConfirmed } from './availability';
import { emergencyFundMonths } from './savings';
import type { FinancialSnapshot } from './snapshot';

export type ObjectiveState = 'done' | 'pending' | 'not_applicable';

export interface Objective {
  key: string;
  title: string;
  state: ObjectiveState;
  evidence: string;
  /** Acción concreta para avanzar (si está pendiente). */
  action?: { label: string; href: Route } | { label: string; checkin: string };
}

export interface Stage {
  number: number;
  title: string;
  purpose: string;
  objectives: Objective[];
  done: number;
  applicable: number;
  complete: boolean;
}

export interface FinancialPlan {
  stages: Stage[];
  currentStage: number;
  capacity: Capacity;
  /** Advertencia clara si los gastos esenciales superan los ingresos. */
  deficitWarning: string | null;
}

const done = (key: string, title: string, evidence: string): Objective => ({
  key,
  title,
  state: 'done',
  evidence,
});
const pending = (key: string, title: string, evidence: string, action?: Objective['action']): Objective => ({
  key,
  title,
  state: 'pending',
  evidence,
  action,
});
const na = (key: string, title: string, evidence: string): Objective => ({
  key,
  title,
  state: 'not_applicable',
  evidence,
});

function checkinSince(s: FinancialSnapshot, key: string, days: number): boolean {
  const since = addDaysIso(s.today, -days);
  return s.checkins.some((c) => c.actionKey === key && c.completedAt.slice(0, 10) >= since);
}

export function buildPlan(s: FinancialSnapshot): FinancialPlan {
  const today = s.today;
  const currency = s.defaultCurrency;
  const capacity = monthlyCapacity(s, currency);
  const commitments = monthlyCommitments(s);
  const averages = monthlyAverages(s);
  const myDebts = s.debts
    .filter((d) => d.direction === 'i_owe' && isOpenDebt(d))
    .map((d) => toDebtView(d, today));
  const activeRecurring = s.recurring.filter((r) => r.status === 'active');
  const emergency = s.goals.find(
    (g) => g.isEmergencyFund && g.status !== 'cancelled' && g.status !== 'archived'
  );
  const fundMonths = emergency ? emergencyFundMonths(emergency.currentAmount, capacity.livingCost) : null;
  const monthlyBudgets = s.budgets.filter((b) => b.period === 'monthly');

  // ---------------- Etapa 1
  const reconciled = s.accounts.filter((a) => isAccountConfirmed(a, today));
  const recentIncome = s.transactions.some((t) => t.type === 'income' && daysBetween(t.date, today) <= 45);
  const essentials = activeRecurring.filter((r) => r.isEssential);
  const unconfirmedDebts = myDebts.filter((d) => !isBalanceConfirmed(d, today));

  const stage1: Objective[] = [
    s.accounts.length === 0
      ? pending('know_money', 'Conocer el dinero disponible', 'No hay cuentas registradas.', {
          label: 'Agregar cuentas',
          href: '/accounts',
        })
      : reconciled.length > 0
        ? done(
            'know_money',
            'Conocer el dinero disponible',
            `${reconciled.length} de ${s.accounts.length} cuenta(s) conciliadas en los últimos 35 días.`
          )
        : pending(
            'know_money',
            'Conocer el dinero disponible',
            'Hay cuentas, pero ninguna conciliada recientemente.',
            { label: 'Conciliar una cuenta', href: '/accounts' }
          ),
    recentIncome
      ? done('income', 'Registrar los ingresos', 'Hay ingresos registrados en los últimos 45 días.')
      : pending('income', 'Registrar los ingresos', 'No hay ingresos registrados en los últimos 45 días.', {
          label: 'Registrar ingreso',
          href: '/transactions',
        }),
    essentials.length > 0
      ? done(
          'essentials',
          'Registrar los gastos esenciales',
          `${essentials.length} gasto(s) recurrente(s) marcados como esenciales.`
        )
      : pending(
          'essentials',
          'Registrar los gastos esenciales',
          'Ningún gasto recurrente está marcado como esencial (arriendo, servicios, alimentación…).',
          { label: 'Registrar recurrentes', href: '/subscriptions' }
        ),
    checkinSince(s, 'debts_inventory', 90)
      ? done('debts_identified', 'Identificar todas las deudas', 'Confirmaste el inventario de deudas.')
      : pending(
          'debts_identified',
          'Identificar todas las deudas',
          'Falta confirmar que todas las deudas están registradas.',
          { label: 'Confirmar inventario', checkin: 'debts_inventory' }
        ),
    myDebts.length === 0
      ? na('balances_confirmed', 'Confirmar los saldos pendientes', 'No hay deudas abiertas registradas.')
      : unconfirmedDebts.length === 0
        ? done(
            'balances_confirmed',
            'Confirmar los saldos pendientes',
            'Todos los saldos están confirmados con los acreedores.'
          )
        : pending(
            'balances_confirmed',
            'Confirmar los saldos pendientes',
            `${unconfirmedDebts.length} deuda(s) con saldo estimado.`,
            { label: 'Ver deudas', href: '/debts' }
          ),
    checkinSince(s, 'obligations_review', 14)
      ? done(
          'upcoming',
          'Identificar las obligaciones próximas',
          'Revisaste los próximos pagos en las últimas 2 semanas.'
        )
      : pending(
          'upcoming',
          'Identificar las obligaciones próximas',
          'Sin revisión reciente de próximos pagos.',
          { label: 'Marcar revisión', checkin: 'obligations_review' }
        ),
    checkinSince(s, 'plan.no_new_commitments', 31)
      ? done('no_new_commitments', 'Evitar nuevos compromisos innecesarios', 'Lo confirmaste este mes.')
      : pending(
          'no_new_commitments',
          'Evitar nuevos compromisos innecesarios',
          'Confirma cada mes que no asumiste compromisos nuevos sin analizarlos.',
          { label: 'Confirmar', checkin: 'plan.no_new_commitments' }
        ),
    checkinSince(s, 'plan.calendar', 31)
      ? done('calendar', 'Organizar un calendario financiero', 'Revisaste el calendario este mes.')
      : pending(
          'calendar',
          'Organizar un calendario financiero',
          'Revisa el calendario de pagos y fechas del mes (menú Calendario) y confírmalo.',
          { label: 'Ya revisé el calendario', checkin: 'plan.calendar' }
        ),
  ];

  // ---------------- Etapa 2
  const reviewedSubs = activeRecurring.filter((r) => r.kind === 'subscription');
  const unreviewed = reviewedSubs.filter(
    (r) => !r.lastReviewedAt || daysBetween(r.lastReviewedAt, today) > 90
  );
  const fullMonths = completeMonthsWithData(s);

  const stage2: Objective[] = [
    essentials.length > 0
      ? done(
          'essential_total',
          'Calcular los gastos esenciales mensuales',
          `Esenciales registrados: ${essentials.length}.`
        )
      : pending(
          'essential_total',
          'Calcular los gastos esenciales mensuales',
          'Marca tus gastos recurrentes esenciales para poder calcularlos.',
          { label: 'Recurrentes', href: '/subscriptions' }
        ),
    activeRecurring.length > 0
      ? done(
          'recurring_total',
          'Calcular los gastos recurrentes',
          `${activeRecurring.length} recurrente(s) activos.`
        )
      : pending(
          'recurring_total',
          'Calcular los gastos recurrentes',
          'No hay gastos recurrentes registrados.',
          { label: 'Recurrentes', href: '/subscriptions' }
        ),
    fullMonths >= 1
      ? done(
          'variable',
          'Identificar los gastos variables',
          `${fullMonths} mes(es) completos de movimientos registrados.`
        )
      : pending(
          'variable',
          'Identificar los gastos variables',
          'Se necesita al menos un mes completo de movimientos.',
          { label: 'Registrar gastos', href: '/transactions' }
        ),
    capacity.monthlySurplus !== null
      ? done(
          'after_expenses',
          'Calcular el dinero disponible después de los gastos',
          `Calculado con ${averages.monthsUsed} meses de historial.`
        )
      : pending(
          'after_expenses',
          'Calcular el dinero disponible después de los gastos',
          'Se necesitan al menos 2 meses completos de ingresos y gastos.'
        ),
    reviewedSubs.length === 0
      ? na('subscriptions', 'Detectar suscripciones que pueden revisarse', 'No hay suscripciones activas.')
      : unreviewed.length === 0
        ? done(
            'subscriptions',
            'Detectar suscripciones que pueden revisarse',
            'Todas las suscripciones revisadas en los últimos 90 días.'
          )
        : pending(
            'subscriptions',
            'Detectar suscripciones que pueden revisarse',
            `${unreviewed.length} suscripción(es) sin revisar.`,
            { label: 'Revisar', href: '/subscriptions' }
          ),
    monthlyBudgets.length > 0
      ? done(
          'budgets',
          'Establecer límites presupuestarios realistas',
          `${monthlyBudgets.length} presupuesto(s) mensual(es).`
        )
      : pending(
          'budgets',
          'Establecer límites presupuestarios realistas',
          'Aún no hay presupuestos mensuales.',
          { label: 'Crear presupuesto', href: '/budgets' }
        ),
  ];

  // ---------------- Etapa 3
  const overdue = myDebts.filter((d) => d.timeline === 'overdue');
  const overdueNotNegotiating = overdue.filter((d) => d.status !== 'negotiating' && d.status !== 'agreement');
  const installments = commitments.debtInstallmentsNotRecurring[currency] ?? 0;
  const starterReserve = capacity.livingCost ? capacity.livingCost * 0.25 : null;

  const stage3: Objective[] = [
    !emergency
      ? pending(
          'emergency_start',
          'Construir una pequeña reserva de emergencia',
          'No hay meta de fondo de emergencia.',
          { label: 'Crear fondo', href: '/savings' }
        )
      : starterReserve !== null && emergency.currentAmount >= starterReserve
        ? done(
            'emergency_start',
            'Construir una pequeña reserva de emergencia',
            'El fondo cubre al menos una semana de gastos de vida.'
          )
        : emergency.currentAmount > 0
          ? done(
              'emergency_start',
              'Construir una pequeña reserva de emergencia',
              'El fondo ya tiene aportes.'
            )
          : pending(
              'emergency_start',
              'Construir una pequeña reserva de emergencia',
              'El fondo existe pero aún no tiene aportes.',
              { label: 'Aportar', href: '/savings' }
            ),
    unconfirmedDebts.length === 0 && s.accounts.length > 0 && reconciled.length === s.accounts.length
      ? done(
          'certainty',
          'Reducir la incertidumbre financiera',
          'Cuentas conciliadas y saldos de deudas confirmados.'
        )
      : pending(
          'certainty',
          'Reducir la incertidumbre financiera',
          'Hay cuentas sin conciliar o deudas con saldo estimado.'
        ),
    overdue.length === 0
      ? na(
          'negotiate',
          'Negociar las deudas que no puedo pagar',
          'No hay deudas vencidas con fecha acordada.'
        )
      : overdueNotNegotiating.length === 0
        ? done(
            'negotiate',
            'Negociar las deudas que no puedo pagar',
            'Las deudas vencidas están en negociación o con acuerdo.'
          )
        : pending(
            'negotiate',
            'Negociar las deudas que no puedo pagar',
            `${overdueNotNegotiating.length} deuda(s) vencida(s) sin negociación registrada.`,
            { label: 'Ver deudas', href: '/debts' }
          ),
    capacity.monthlySurplus === null
      ? pending(
          'sustainable_plan',
          'Crear un plan de pago sostenible',
          'Faltan meses de historial para saber cuánto puedes pagar.'
        )
      : capacity.monthlySurplus >= 0
        ? done(
            'sustainable_plan',
            'Crear un plan de pago sostenible',
            'Las cuotas actuales caben en tus ingresos promedio después de vivir.'
          )
        : pending(
            'sustainable_plan',
            'Crear un plan de pago sostenible',
            'Las cuotas actuales más lo esencial superan tus ingresos promedio: conviene renegociar plazos o cuotas.',
            { label: 'Ver deudas', href: '/debts' }
          ),
    capacity.averageIncome === null || capacity.livingCost === null
      ? pending(
          'protect_living',
          'No comprometer el dinero para vivir',
          'Se necesita historial de ingresos y gastos.'
        )
      : sumMoney([capacity.livingCost, installments]) <= capacity.averageIncome
        ? done(
            'protect_living',
            'No comprometer el dinero para vivir',
            'Gastos de vida + cuotas ≤ ingresos promedio.'
          )
        : pending(
            'protect_living',
            'No comprometer el dinero para vivir',
            'Gastos de vida + cuotas superan los ingresos promedio.'
          ),
  ];

  // ---------------- Etapa 4
  const withoutPriority = myDebts.filter((d) => !d.priority);
  const paidLast90 = s.debtPayments.some((p) => daysBetween(p.paymentDate, today) <= 90);
  const negotiatingWithoutNotes = myDebts.filter(
    (d) => (d.status === 'agreement' || d.status === 'negotiating') && !d.notes
  );

  const stage4: Objective[] =
    myDebts.length === 0
      ? [na('no_debts', 'Reducción de deudas', 'No hay deudas abiertas registradas.')]
      : [
          withoutPriority.length === 0
            ? done('priorities', 'Priorizar según condiciones reales', 'Todas las deudas tienen prioridad.')
            : pending(
                'priorities',
                'Priorizar según condiciones reales',
                `${withoutPriority.length} deuda(s) sin prioridad.`,
                { label: 'Asignar prioridades', href: '/debts' }
              ),
          myDebts.some((d) => d.interestRate !== null)
            ? done(
                'compare',
                'Evaluar opciones y comparar escenarios',
                'Hay datos de interés para comparar estrategias en Deudas.'
              )
            : pending(
                'compare',
                'Evaluar opciones y comparar escenarios',
                'Sin tasas de interés registradas no se pueden comparar escenarios.',
                { label: 'Completar deudas', href: '/debts' }
              ),
          negotiatingWithoutNotes.length === 0
            ? done(
                'agreements',
                'Registrar los acuerdos alcanzados',
                'Los acuerdos y negociaciones tienen notas.'
              )
            : pending(
                'agreements',
                'Registrar los acuerdos alcanzados',
                `${negotiatingWithoutNotes.length} negociación(es) sin notas del acuerdo.`,
                { label: 'Ver deudas', href: '/debts' }
              ),
          paidLast90
            ? done(
                'progress',
                'Medir el saldo pendiente y el avance',
                'Hay pagos registrados en los últimos 90 días.'
              )
            : pending(
                'progress',
                'Medir el saldo pendiente y el avance',
                'Sin pagos registrados en los últimos 90 días.'
              ),
        ];

  // ---------------- Etapa 5
  const otherGoals = s.goals.filter((g) => !g.isEmergencyFund && g.status === 'active');
  const contributedRecently = s.contributions.some(
    (c) => c.kind === 'deposit' && daysBetween(c.date, today) <= 31
  );

  const stage5: Objective[] = [
    otherGoals.length > 0
      ? done(
          'goals',
          'Crear metas de ahorro',
          `${otherGoals.length} meta(s) activa(s) además del fondo de emergencia.`
        )
      : pending('goals', 'Crear metas de ahorro', 'No hay metas activas además del fondo de emergencia.', {
          label: 'Crear meta',
          href: '/savings',
        }),
    otherGoals.length > 0 && otherGoals.every((g) => g.plannedMonthlyContribution)
      ? done(
          'contributions_plan',
          'Establecer aportaciones realistas',
          'Todas las metas tienen aporte mensual planificado.'
        )
      : pending(
          'contributions_plan',
          'Establecer aportaciones realistas',
          'Define un aporte mensual realista para cada meta.',
          { label: 'Metas', href: '/savings' }
        ),
    capacity.status === 'deficit'
      ? na(
          'saving_now',
          'Revisar el progreso',
          'Con el historial actual no hay capacidad de ahorro: primero las etapas 2 y 3.'
        )
      : contributedRecently
        ? done('saving_now', 'Revisar el progreso', 'Hubo aportes en el último mes.')
        : pending('saving_now', 'Revisar el progreso', 'Sin aportes en el último mes.'),
  ];

  // ---------------- Etapa 6 (condiciones, no recomendaciones de inversión)
  const stage6: Objective[] = [
    fundMonths !== null && fundMonths >= 3
      ? done(
          'fund_3m',
          'Fondo de emergencia de al menos 3 meses',
          `El fondo cubre ${fundMonths} meses de gastos de vida.`
        )
      : pending(
          'fund_3m',
          'Fondo de emergencia de al menos 3 meses',
          fundMonths === null
            ? 'Falta el fondo o el dato de gasto mensual.'
            : `Hoy cubre ${fundMonths} meses.`
        ),
    overdue.length === 0
      ? done('no_overdue', 'Sin obligaciones vencidas', 'No hay deudas vencidas.')
      : pending('no_overdue', 'Sin obligaciones vencidas', `${overdue.length} deuda(s) vencida(s).`),
    capacity.status === 'surplus'
      ? done('surplus', 'Capacidad de ahorro positiva sostenida', 'El historial muestra excedente mensual.')
      : pending('surplus', 'Capacidad de ahorro positiva sostenida', 'Sin excedente mensual comprobado.'),
    s.riskTolerance
      ? done('risk', 'Conocer tu tolerancia al riesgo', 'Definida en Configuración.')
      : pending('risk', 'Conocer tu tolerancia al riesgo', 'No está definida.', {
          label: 'Definir en Configuración',
          href: '/settings',
        }),
  ];

  const defs: [string, string, Objective[]][] = [
    ['Estabilización', 'Saber con exactitud dónde estás hoy.', stage1],
    ['Presupuesto', 'Entender a dónde va tu dinero cada mes.', stage2],
    ['Estabilidad', 'Tener un pequeño colchón y obligaciones manejables.', stage3],
    ['Reducción de deudas', 'Bajar el saldo pendiente con un plan realista.', stage4],
    ['Ahorro', 'Construir metas con aportes sostenibles.', stage5],
    ['Crecimiento financiero', 'Evaluar crecer solo cuando la base esté firme.', stage6],
  ];

  const stages: Stage[] = defs.map(([title, purpose, objectives], i) => {
    const applicable = objectives.filter((o) => o.state !== 'not_applicable').length;
    const doneCount = objectives.filter((o) => o.state === 'done').length;
    return {
      number: i + 1,
      title,
      purpose,
      objectives,
      done: doneCount,
      applicable,
      complete: doneCount === applicable,
    };
  });

  const deficitWarning =
    capacity.status === 'deficit'
      ? 'Con tus datos de los últimos meses, los gastos de vida y las cuotas superan tus ingresos. No es un juicio: es el punto de partida. Opciones a estudiar: renegociar plazos o cuotas, reducir gastos variables, revisar suscripciones y buscar ingresos adicionales.'
      : null;

  return { stages, currentStage: stages.find((st) => !st.complete)?.number ?? 6, capacity, deficitWarning };
}

/** Fecha más próxima acordada entre las deudas abiertas (para el calendario del plan). */
export function nextObligationDate(s: FinancialSnapshot): IsoDate | null {
  const dates = s.debts
    .filter((d) => d.direction === 'i_owe' && isOpenDebt(d))
    .map(agreedDate)
    .filter((d): d is string => !!d && d >= s.today)
    .sort();
  return dates[0] ?? null;
}

export const MONTH_CLOSE_WINDOW_DAYS = 5;

/** El cierre mensual se sugiere en los últimos/primeros días del mes. */
export function isMonthCloseWindow(today: IsoDate): boolean {
  const start = monthStart(today);
  const nextStart = monthStart(addDaysIso(start, 32));
  return daysBetween(start, today) < MONTH_CLOSE_WINDOW_DAYS || daysBetween(today, nextStart) <= 3;
}
