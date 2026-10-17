import { divideMoney, subtractMoney, sumMoney } from '@/shared/lib/money';
import { addMonthsIso, daysBetween, monthsBetween, type IsoDate } from '@/shared/lib/dates';
import type { FinancialSnapshot, SnapshotGoal } from './snapshot';

export interface GoalMetrics {
  goalId: string;
  remaining: number;
  percent: number;
  /** Meses que quedan hasta la fecha objetivo (mínimo 1 si la fecha es futura). null = sin fecha. */
  monthsRemaining: number | null;
  /** Aporte mensual necesario para llegar a tiempo. null = sin fecha o fecha pasada. */
  requiredMonthly: number | null;
  /** Avance esperado a hoy si se ahorrara de forma lineal desde la creación. null = sin fecha. */
  expectedPercent: number | null;
  /** Aporte neto promedio de los últimos 3 meses (real, no planificado). */
  actualMonthlyPace: number;
  /** Fecha estimada con el ritmo real (o el aporte planificado si no hay ritmo). */
  estimatedCompletion: IsoDate | null;
  estimateBasis: 'actual_pace' | 'planned' | 'none';
  status: 'done' | 'on_track' | 'behind' | 'overdue' | 'no_date' | 'inactive';
}

function addMonthsCeil(today: IsoDate, remaining: number, perMonth: number): IsoDate | null {
  if (perMonth <= 0) return null;
  const months = Math.ceil(remaining / perMonth);
  return months > 600 ? null : addMonthsIso(today, months);
}

export function goalMetrics(
  goal: SnapshotGoal,
  snapshot: Pick<FinancialSnapshot, 'today' | 'contributions'>
): GoalMetrics {
  const { today } = snapshot;
  const remaining = Math.max(0, subtractMoney(goal.targetAmount, goal.currentAmount));
  const percent =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 1000) / 10)
      : 0;

  const since = addMonthsIso(today, -3);
  const recent = snapshot.contributions.filter(
    (c) => c.goalId === goal.id && c.date > since && c.date <= today
  );
  const netRecent = sumMoney(recent.map((c) => (c.kind === 'withdrawal' ? -c.amount : c.amount)));
  const ageMonths = Math.max(1, Math.min(3, monthsBetween(goal.createdAt.slice(0, 10), today) || 1));
  const actualMonthlyPace = netRecent > 0 ? divideMoney(netRecent, ageMonths) : 0;

  let monthsRemaining: number | null = null;
  let requiredMonthly: number | null = null;
  let expectedPercent: number | null = null;
  if (goal.targetDate) {
    if (goal.targetDate >= today) {
      monthsRemaining = Math.max(1, Math.ceil(daysBetween(today, goal.targetDate) / 30.4375));
      requiredMonthly = remaining > 0 ? divideMoney(remaining, monthsRemaining) : 0;
    }
    const totalDays = daysBetween(goal.createdAt.slice(0, 10), goal.targetDate);
    const elapsedDays = daysBetween(goal.createdAt.slice(0, 10), today);
    expectedPercent =
      totalDays <= 0 ? 100 : Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 1000) / 10));
  }

  let estimatedCompletion: IsoDate | null = null;
  let estimateBasis: GoalMetrics['estimateBasis'] = 'none';
  if (remaining === 0) estimatedCompletion = today;
  else if (actualMonthlyPace > 0) {
    estimatedCompletion = addMonthsCeil(today, remaining, actualMonthlyPace);
    estimateBasis = 'actual_pace';
  } else if (goal.plannedMonthlyContribution) {
    estimatedCompletion = addMonthsCeil(today, remaining, goal.plannedMonthlyContribution);
    estimateBasis = 'planned';
  }

  let status: GoalMetrics['status'];
  if (goal.status === 'paused' || goal.status === 'cancelled' || goal.status === 'archived')
    status = 'inactive';
  else if (remaining === 0 || goal.status === 'completed') status = 'done';
  else if (!goal.targetDate) status = 'no_date';
  else if (goal.targetDate < today) status = 'overdue';
  else status = expectedPercent !== null && percent + 0.0001 < expectedPercent - 10 ? 'behind' : 'on_track';

  return {
    goalId: goal.id,
    remaining,
    percent,
    monthsRemaining,
    requiredMonthly,
    expectedPercent,
    actualMonthlyPace,
    estimatedCompletion,
    estimateBasis,
    status,
  };
}

// ---------------------------------------------------------------------------
// Escenarios

export type ScenarioKind = 'conservative' | 'base' | 'optimistic';

export interface ScenarioInput {
  kind: ScenarioKind;
  /** Monto mensual total destinado a metas en esta moneda. null = no se puede calcular. */
  monthlyAmount: number | null;
  /** Supuestos declarados (solo optimista): se muestran como supuestos, no hechos. */
  assumptions?: string[];
}

export interface GoalAllocation {
  goalId: string;
  name: string;
  monthly: number;
  completion: IsoDate | null;
  meetsTargetDate: boolean | null;
  /** Fecha alternativa realista si no llega a tiempo. */
  alternativeDate: IsoDate | null;
}

export interface ScenarioResult {
  kind: ScenarioKind;
  currency: string;
  monthlyAmount: number | null;
  assumptions: string[];
  allocations: GoalAllocation[];
  message: string;
}

/**
 * Reparte un monto mensual entre las metas activas de una moneda por
 * prioridad (1 = más importante): cada meta recibe lo que necesita para
 * llegar a tiempo (o el resto si no tiene fecha) mientras alcance el dinero.
 * No mueve dinero ni reserva nada: es una simulación.
 */
export function runScenario(
  goals: SnapshotGoal[],
  snapshot: Pick<FinancialSnapshot, 'today' | 'contributions'>,
  currency: string,
  input: ScenarioInput
): ScenarioResult {
  const active = goals
    .filter((g) => g.currency === currency && g.status === 'active')
    .map((g) => ({ goal: g, metrics: goalMetrics(g, snapshot) }))
    .filter(({ metrics }) => metrics.remaining > 0)
    .sort(
      (a, b) =>
        a.goal.priority - b.goal.priority ||
        (a.goal.targetDate ?? '9999').localeCompare(b.goal.targetDate ?? '9999')
    );

  const base = {
    kind: input.kind,
    currency,
    monthlyAmount: input.monthlyAmount,
    assumptions: input.assumptions ?? [],
  };

  if (input.monthlyAmount === null) {
    return {
      ...base,
      allocations: [],
      message:
        'Aún no hay suficientes meses de ingresos y gastos registrados para calcular cuánto queda disponible.',
    };
  }
  if (input.monthlyAmount <= 0) {
    return {
      ...base,
      allocations: active.map(({ goal }) => ({
        goalId: goal.id,
        name: goal.name,
        monthly: 0,
        completion: null,
        meetsTargetDate: goal.targetDate ? false : null,
        alternativeDate: null,
      })),
      message:
        'Con los datos actuales no queda dinero disponible para ahorrar después de cubrir lo esencial y las cuotas. Revisa el plan para estudiar alternativas antes de fijar aportes.',
    };
  }

  let left = input.monthlyAmount;
  const allocations: GoalAllocation[] = [];
  for (const { goal, metrics } of active) {
    const wanted = metrics.requiredMonthly ?? metrics.remaining;
    const monthly = Math.max(0, Math.min(left, wanted));
    left = subtractMoney(left, monthly);
    const completion = monthly > 0 ? addMonthsCeil(snapshot.today, metrics.remaining, monthly) : null;
    const meetsTargetDate = goal.targetDate ? completion !== null && completion <= goal.targetDate : null;
    allocations.push({
      goalId: goal.id,
      name: goal.name,
      monthly,
      completion,
      meetsTargetDate,
      alternativeDate: meetsTargetDate === false ? completion : null,
    });
  }
  const unmet = allocations.filter((a) => a.meetsTargetDate === false).length;
  const message =
    allocations.length === 0
      ? 'No hay metas activas pendientes en esta moneda.'
      : unmet === 0
        ? 'Con este monto todas las metas con fecha llegan a tiempo.'
        : `${unmet} meta(s) no llegan a su fecha con este monto. Se muestran fechas alternativas realistas.`;
  return { ...base, allocations, message };
}

/** Meses de gasto esencial que cubre el fondo de emergencia. null si no hay dato de gasto. */
export function emergencyFundMonths(fund: number, monthlyLivingCost: number | null): number | null {
  if (!monthlyLivingCost || monthlyLivingCost <= 0) return null;
  return Math.round((fund / monthlyLivingCost) * 10) / 10;
}
