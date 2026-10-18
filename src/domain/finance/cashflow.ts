import { addToTotals, divideMoney, sumMoney, subtractTotals, type CurrencyTotals } from '@/shared/lib/money';
import { addMonthsIso, daysBetween, isBetween, monthEnd, monthStart, type IsoDate } from '@/shared/lib/dates';
import type { BillingCycle, FinancialSnapshot, SnapshotRecurring } from './snapshot';

/** Factor para pasar un importe recurrente a su equivalente mensual. */
const MONTHLY_FACTOR: Record<BillingCycle, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  bimonthly: 1 / 2,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

/** Equivalente mensual. null = frecuencia desconocida (no se puede prorratear sin inventarla). */
export function monthlyEquivalent(r: Pick<SnapshotRecurring, 'amount' | 'billingCycle'>): number | null {
  if (!r.billingCycle) return null;
  return Math.round(r.amount * MONTHLY_FACTOR[r.billingCycle] * 100) / 100;
}

export interface MonthSummary {
  monthStart: IsoDate;
  income: CurrencyTotals;
  expense: CurrencyTotals;
  /** Parte del gasto que fue pago de deudas (enlazado a un abono). */
  debtPayments: CurrencyTotals;
  /** Abonos a deudas registrados SIN movimiento de cuenta (informativo, no suma al gasto). */
  debtPaymentsWithoutMovement: CurrencyTotals;
  fixed: CurrencyTotals;
  subscriptions: CurrencyTotals;
  variable: CurrencyTotals;
  /** Variación del saldo de las cuentas (ingresos − gastos ± transferencias entre monedas). */
  balanceChange: CurrencyTotals;
  /** Ahorro real: ingresos − gastos (las transferencias no cuentan). */
  realSaving: CurrencyTotals;
  movementCount: number;
}

/** Resumen de un mes con lo EFECTIVAMENTE registrado (no proyecciones). */
export function summarizeMonth(snapshot: FinancialSnapshot, anyDayOfMonth: IsoDate): MonthSummary {
  const start = monthStart(anyDayOfMonth);
  const end = monthEnd(anyDayOfMonth);
  const recurringById = new Map(snapshot.recurring.map((r) => [r.id, r]));
  const paymentTransactionIds = new Set(snapshot.debtPayments.map((p) => p.transactionId).filter(Boolean));

  const summary: MonthSummary = {
    monthStart: start,
    income: {},
    expense: {},
    debtPayments: {},
    debtPaymentsWithoutMovement: {},
    fixed: {},
    subscriptions: {},
    variable: {},
    balanceChange: {},
    realSaving: {},
    movementCount: 0,
  };

  for (const t of snapshot.transactions) {
    if (!isBetween(t.date, start, end)) continue;
    if (t.type === 'transfer') {
      if (t.transferDirection)
        addToTotals(summary.balanceChange, t.currency, t.transferDirection === 'in' ? t.amount : -t.amount);
      continue;
    }
    summary.movementCount += 1;
    if (t.type === 'income') {
      addToTotals(summary.income, t.currency, t.amount);
      continue;
    }
    addToTotals(summary.expense, t.currency, t.amount);
    const recurring = t.subscriptionId ? recurringById.get(t.subscriptionId) : undefined;
    if (paymentTransactionIds.has(t.id)) addToTotals(summary.debtPayments, t.currency, t.amount);
    else if (recurring?.kind === 'subscription') addToTotals(summary.subscriptions, t.currency, t.amount);
    else if (recurring && recurring.kind !== 'extraordinary')
      addToTotals(summary.fixed, t.currency, t.amount);
    else addToTotals(summary.variable, t.currency, t.amount);
  }

  const debtCurrency = new Map(snapshot.debts.map((d) => [d.id, d.currency]));
  for (const p of snapshot.debtPayments) {
    if (!isBetween(p.paymentDate, start, end) || p.transactionId) continue;
    const debt = snapshot.debts.find((d) => d.id === p.debtId);
    if (debt?.direction !== 'i_owe') continue;
    addToTotals(summary.debtPaymentsWithoutMovement, debtCurrency.get(p.debtId) ?? 'COP', p.amount);
  }

  summary.realSaving = subtractTotals(summary.income, summary.expense);
  for (const [currency, amount] of Object.entries(summary.realSaving))
    addToTotals(summary.balanceChange, currency, amount);
  return summary;
}

export interface Averages {
  /** Meses completos con al menos un movimiento usados en el promedio. */
  monthsUsed: number;
  income: CurrencyTotals | null;
  expense: CurrencyTotals | null;
  expenseExcludingDebt: CurrencyTotals | null;
}

export const MIN_MONTHS_FOR_AVERAGE = 2;

/** Promedio de los últimos 3 meses COMPLETOS con datos. Con menos de 2 meses → null (pendiente). */
export function monthlyAverages(snapshot: FinancialSnapshot): Averages {
  const months = [1, 2, 3]
    .map((back) => summarizeMonth(snapshot, addMonthsIso(monthStart(snapshot.today), -back)))
    .filter((m) => m.movementCount > 0);

  if (months.length < MIN_MONTHS_FOR_AVERAGE) {
    return { monthsUsed: months.length, income: null, expense: null, expenseExcludingDebt: null };
  }
  const avg = (pick: (m: MonthSummary) => CurrencyTotals) => {
    const sum: CurrencyTotals = {};
    for (const m of months) for (const [c, v] of Object.entries(pick(m))) addToTotals(sum, c, v);
    return Object.fromEntries(Object.entries(sum).map(([c, v]) => [c, divideMoney(v, months.length)]));
  };
  return {
    monthsUsed: months.length,
    income: avg((m) => m.income),
    expense: avg((m) => m.expense),
    expenseExcludingDebt: avg((m) => subtractTotals(m.expense, m.debtPayments)),
  };
}

export interface Commitments {
  /** Recurrentes activos esenciales, equivalente mensual. */
  essentialRecurring: CurrencyTotals;
  /** Todos los recurrentes activos, equivalente mensual (cuotas enlazadas a deudas incluidas una vez). */
  allRecurring: CurrencyTotals;
  /** Cuotas de deudas que NO están ya registradas como recurrente. */
  debtInstallmentsNotRecurring: CurrencyTotals;
  /** Total comprometido al mes = recurrentes + cuotas no duplicadas. */
  totalMonthly: CurrencyTotals;
  hasEssentialData: boolean;
  /** Recurrentes con importe y frecuencia confirmados (equivalente mensual). */
  confirmedRecurring: CurrencyTotals;
  /** Recurrentes con importe aproximado o frecuencia por confirmar (equivalente mensual). */
  estimatedRecurring: CurrencyTotals;
  /** Recurrentes sin frecuencia conocida: no se suman a ningún total mensual. */
  unknownFrequency: SnapshotRecurring[];
}

/**
 * Compromisos mensuales conocidos. Una cuota de préstamo que el usuario
 * registró como recurrente enlazado a la deuda se cuenta una sola vez.
 */
export function monthlyCommitments(snapshot: FinancialSnapshot): Commitments {
  const active = snapshot.recurring.filter((r) => r.status === 'active');
  const essentialRecurring: CurrencyTotals = {};
  const allRecurring: CurrencyTotals = {};
  const confirmedRecurring: CurrencyTotals = {};
  const estimatedRecurring: CurrencyTotals = {};
  const unknownFrequency: SnapshotRecurring[] = [];
  for (const r of active) {
    const monthly = monthlyEquivalent(r);
    if (monthly === null) {
      unknownFrequency.push(r);
      continue;
    }
    addToTotals(allRecurring, r.currency, monthly);
    addToTotals(
      r.amountIsEstimate || !r.cycleConfirmed ? estimatedRecurring : confirmedRecurring,
      r.currency,
      monthly
    );
    if (r.isEssential) addToTotals(essentialRecurring, r.currency, monthly);
  }
  const linkedDebtIds = new Set(active.map((r) => r.debtId).filter(Boolean));
  const debtInstallmentsNotRecurring: CurrencyTotals = {};
  for (const d of snapshot.debts) {
    if (
      d.direction !== 'i_owe' ||
      d.status === 'paid' ||
      (d.remainingBalance !== null && d.remainingBalance <= 0) ||
      !d.installmentAmount
    )
      continue;
    if (linkedDebtIds.has(d.id)) continue;
    addToTotals(debtInstallmentsNotRecurring, d.currency, d.installmentAmount);
  }
  const totalMonthly: CurrencyTotals = { ...allRecurring };
  for (const [c, v] of Object.entries(debtInstallmentsNotRecurring)) addToTotals(totalMonthly, c, v);
  return {
    essentialRecurring,
    allRecurring,
    debtInstallmentsNotRecurring,
    totalMonthly,
    hasEssentialData: active.some((r) => r.isEssential),
    confirmedRecurring,
    estimatedRecurring,
    unknownFrequency,
  };
}

export interface Capacity {
  currency: string;
  /** null = no hay historial suficiente para saberlo. */
  averageIncome: number | null;
  /** Gasto de vida estimado: el mayor entre el promedio real (sin deudas) y los esenciales declarados. */
  livingCost: number | null;
  debtInstallments: number;
  /** Lo que queda al mes tras vivir y pagar cuotas. Puede ser negativo. null = desconocido. */
  monthlySurplus: number | null;
  status: 'unknown' | 'deficit' | 'tight' | 'surplus';
}

/** Capacidad mensual (en una moneda) para deudas y ahorro, con datos reales. */
export function monthlyCapacity(snapshot: FinancialSnapshot, currency: string): Capacity {
  const averages = monthlyAverages(snapshot);
  const commitments = monthlyCommitments(snapshot);
  const installments = sumMoney([commitments.debtInstallmentsNotRecurring[currency] ?? 0]);
  const essential = commitments.essentialRecurring[currency] ?? 0;

  if (!averages.income) {
    return {
      currency,
      averageIncome: null,
      livingCost: commitments.hasEssentialData ? essential : null,
      debtInstallments: installments,
      monthlySurplus: null,
      status: 'unknown',
    };
  }
  const income = averages.income[currency] ?? 0;
  const living = Math.max(averages.expenseExcludingDebt?.[currency] ?? 0, essential);
  const surplus = sumMoney([income, -living, -installments]);
  const status = surplus < 0 ? 'deficit' : income > 0 && surplus < income * 0.05 ? 'tight' : 'surplus';
  return {
    currency,
    averageIncome: income,
    livingCost: living,
    debtInstallments: installments,
    monthlySurplus: surplus,
    status,
  };
}

export interface BudgetProjection {
  projected: number | null;
  /** Por qué no se proyecta, si aplica. */
  reason: string | null;
}

export const MIN_DAYS_FOR_PROJECTION = 10;

/**
 * Proyección de cierre de un presupuesto. No se proyecta si van menos de
 * 10 días del periodo o si no hay al menos un mes completo de historial:
 * una cifra así aparentaría una precisión que no existe.
 */
export function projectBudget(
  budget: { spent: number; periodStart: IsoDate; periodEnd: IsoDate },
  today: IsoDate,
  completeMonthsOfHistory: number
): BudgetProjection {
  if (completeMonthsOfHistory < 1)
    return { projected: null, reason: 'Aún no hay un mes completo de historial.' };
  const elapsed = daysBetween(budget.periodStart, today) + 1;
  const total = daysBetween(budget.periodStart, budget.periodEnd) + 1;
  if (elapsed < MIN_DAYS_FOR_PROJECTION)
    return {
      projected: null,
      reason: `Se proyecta a partir del día ${MIN_DAYS_FOR_PROJECTION} del periodo.`,
    };
  if (elapsed >= total) return { projected: budget.spent, reason: null };
  return { projected: Math.round((budget.spent / elapsed) * total), reason: null };
}

/** Meses completos (anteriores al actual) con al menos un movimiento. */
export function completeMonthsWithData(snapshot: FinancialSnapshot, lookback = 12): number {
  let count = 0;
  for (let back = 1; back <= lookback; back++) {
    if (summarizeMonth(snapshot, addMonthsIso(monthStart(snapshot.today), -back)).movementCount > 0) count++;
  }
  return count;
}
