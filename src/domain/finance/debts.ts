import { addToTotals, sumMoney, type CurrencyTotals } from '@/shared/lib/money';
import { addDaysIso, daysBetween, type IsoDate } from '@/shared/lib/dates';
import { consolidate, type Consolidated } from './fx';
import type { FinancialSnapshot, SnapshotDebt, SnapshotRate } from './snapshot';

export const CONFIRMATION_FRESH_DAYS = 90;
export const UPCOMING_WINDOW_DAYS = 30;

const CURRENCY_COUNTRY: Record<string, string> = { COP: 'CO', CLP: 'CL' };

export interface ResolvedCountry {
  country: string | null;
  /** true si no se indicó y se dedujo de la moneda. */
  inferred: boolean;
}

export function resolveCountry(country: string | null, currency: string): ResolvedCountry {
  if (country) return { country, inferred: false };
  const fromCurrency = CURRENCY_COUNTRY[currency];
  return fromCurrency ? { country: fromCurrency, inferred: true } : { country: null, inferred: false };
}

/** Abierta = no pagada y con saldo pendiente (o con saldo DESCONOCIDO: no se da por pagada). */
export function isOpenDebt(debt: SnapshotDebt): boolean {
  return debt.status !== 'paid' && (debt.remainingBalance === null || debt.remainingBalance > 0);
}

/** Próxima fecha ACORDADA (cuota o vencimiento). null = sin fecha acordada. */
export function agreedDate(debt: SnapshotDebt): IsoDate | null {
  return debt.nextPaymentDate ?? debt.dueDate;
}

export type DebtTimeline = 'paid' | 'overdue' | 'due_soon' | 'scheduled' | 'no_date';

/**
 * Situación temporal. Una deuda sin fecha acordada NUNCA es "vencida":
 * se reporta como "sin fecha". Solo es vencida si el usuario la marcó así o
 * si tiene fecha acordada pasada y saldo pendiente.
 */
export function debtTimeline(debt: SnapshotDebt, today: IsoDate): DebtTimeline {
  if (!isOpenDebt(debt)) return 'paid';
  if (debt.status === 'overdue') return 'overdue';
  const date = agreedDate(debt);
  if (!date) return 'no_date';
  if (date < today) return 'overdue';
  if (daysBetween(today, date) <= UPCOMING_WINDOW_DAYS) return 'due_soon';
  return 'scheduled';
}

/** Saldo confirmado = confirmado con el acreedor y sin pagos posteriores que lo vuelvan estimado. */
export function isBalanceConfirmed(debt: SnapshotDebt, today: IsoDate): boolean {
  return (
    debt.balanceConfirmedAt !== null &&
    debt.paymentsSinceConfirmation === 0 &&
    daysBetween(debt.balanceConfirmedAt, today) <= CONFIRMATION_FRESH_DAYS
  );
}

export type DebtGap =
  | 'balance_unknown'
  | 'amount_estimate'
  | 'balance_unconfirmed'
  | 'country_unknown'
  | 'interest_unknown'
  | 'interest_period_unknown'
  | 'kind_unknown';

export const DEBT_GAP_LABEL: Record<DebtGap, string> = {
  balance_unknown: 'Saldo total desconocido (solo se conoce la cuota)',
  amount_estimate: 'Importe aproximado',
  balance_unconfirmed: 'Saldo sin confirmar con el acreedor',
  country_unknown: 'País sin indicar',
  interest_unknown: 'Interés sin indicar',
  interest_period_unknown: 'No se sabe si el interés es mensual o anual',
  kind_unknown: 'Tipo de deuda sin indicar',
};

export function debtGaps(debt: SnapshotDebt, today: IsoDate): DebtGap[] {
  const gaps: DebtGap[] = [];
  if (debt.remainingBalance === null) gaps.push('balance_unknown');
  else if (!isBalanceConfirmed(debt, today)) gaps.push('balance_unconfirmed');
  if (debt.amountIsEstimate) gaps.push('amount_estimate');
  if (!resolveCountry(debt.country, debt.currency).country) gaps.push('country_unknown');
  if (debt.kind === 'other') gaps.push('kind_unknown');
  if (debt.interestRate === null) gaps.push('interest_unknown');
  else if (debt.interestRate > 0 && !debt.interestRatePeriod) gaps.push('interest_period_unknown');
  return gaps;
}

export interface DebtView extends SnapshotDebt {
  timeline: DebtTimeline;
  confirmed: boolean;
  resolvedCountry: ResolvedCountry;
  gaps: DebtGap[];
  daysToAgreedDate: number | null;
}

export interface DebtSide {
  byCurrency: CurrencyTotals;
  confirmedByCurrency: CurrencyTotals;
  estimatedByCurrency: CurrencyTotals;
  /** Por país (CO, CL, '??' si no se sabe) y moneda. */
  byCountry: Record<string, CurrencyTotals>;
  totalCop: Consolidated;
  count: number;
  /** Deudas abiertas cuyo saldo total no se conoce: no están en ningún total. */
  unknownBalanceCount: number;
  /** Parte de los totales que corresponde a obligaciones compartidas o a nombre de terceros. */
  sharedOrThirdPartyByCurrency: CurrencyTotals;
}

export interface DebtSummary {
  debts: DebtView[];
  iOwe: DebtSide;
  owedToMe: DebtSide;
  upcoming: DebtView[];
  overdue: DebtView[];
  noDate: DebtView[];
  negotiating: DebtView[];
  incomplete: DebtView[];
  /** Cuotas pactadas por mes, por moneda (solo deudas con cuota indicada). */
  monthlyInstallments: CurrencyTotals;
}

function buildSide(debts: DebtView[], rates: SnapshotRate[], today: IsoDate): DebtSide {
  const side: DebtSide = {
    byCurrency: {},
    confirmedByCurrency: {},
    estimatedByCurrency: {},
    byCountry: {},
    totalCop: consolidate({}, 'COP', rates, today),
    count: debts.length,
    unknownBalanceCount: 0,
    sharedOrThirdPartyByCurrency: {},
  };
  for (const d of debts) {
    if (d.remainingBalance === null) {
      side.unknownBalanceCount += 1;
      continue;
    }
    if (d.responsibility !== 'own')
      addToTotals(side.sharedOrThirdPartyByCurrency, d.currency, d.remainingBalance);
    addToTotals(side.byCurrency, d.currency, d.remainingBalance);
    addToTotals(
      d.confirmed ? side.confirmedByCurrency : side.estimatedByCurrency,
      d.currency,
      d.remainingBalance
    );
    const country = d.resolvedCountry.country ?? '??';
    side.byCountry[country] ??= {};
    addToTotals(side.byCountry[country], d.currency, d.remainingBalance);
  }
  side.totalCop = consolidate(side.byCurrency, 'COP', rates, today);
  return side;
}

export function toDebtView(debt: SnapshotDebt, today: IsoDate): DebtView {
  const date = agreedDate(debt);
  return {
    ...debt,
    timeline: debtTimeline(debt, today),
    confirmed: isBalanceConfirmed(debt, today),
    resolvedCountry: resolveCountry(debt.country, debt.currency),
    gaps: debtGaps(debt, today),
    daysToAgreedDate: date ? daysBetween(today, date) : null,
  };
}

export function summarizeDebts(snapshot: FinancialSnapshot): DebtSummary {
  const { today, rates } = snapshot;
  const views = snapshot.debts.map((d) => toDebtView(d, today));
  const open = views.filter((d) => d.timeline !== 'paid');
  const mine = open.filter((d) => d.direction === 'i_owe');
  const byDate = (a: DebtView, b: DebtView) =>
    (agreedDate(a) ?? '9999').localeCompare(agreedDate(b) ?? '9999');

  const monthlyInstallments: CurrencyTotals = {};
  for (const d of mine)
    if (d.installmentAmount) addToTotals(monthlyInstallments, d.currency, d.installmentAmount);

  return {
    debts: views,
    iOwe: buildSide(mine, rates, today),
    owedToMe: buildSide(
      open.filter((d) => d.direction === 'owed_to_me'),
      rates,
      today
    ),
    upcoming: mine.filter((d) => d.timeline === 'due_soon').sort(byDate),
    overdue: mine.filter((d) => d.timeline === 'overdue').sort(byDate),
    noDate: mine.filter((d) => d.timeline === 'no_date'),
    negotiating: mine.filter((d) => d.status === 'negotiating' || d.status === 'agreement'),
    incomplete: mine.filter((d) => d.gaps.length > 0),
    monthlyInstallments,
  };
}

// ---------------------------------------------------------------------------
// Simulación de pago (avalancha vs. bola de nieve)

export type PayoffStrategy = 'avalanche' | 'snowball';

export interface PayoffResult {
  strategy: PayoffStrategy;
  feasible: boolean;
  months: number | null;
  totalInterest: number;
  order: string[];
  warnings: string[];
}

/** Tasa mensual en fracción, o null si no se conoce (no se supone). */
export function monthlyRate(debt: Pick<SnapshotDebt, 'interestRate' | 'interestRatePeriod'>): number | null {
  if (debt.interestRate === null) return null;
  if (debt.interestRate === 0) return 0;
  if (debt.interestRatePeriod === 'monthly') return debt.interestRate / 100;
  if (debt.interestRatePeriod === 'annual') return Math.pow(1 + debt.interestRate / 100, 1 / 12) - 1;
  return null;
}

const MAX_MONTHS = 600;

/**
 * Simula pagar deudas de UNA moneda con `monthlyBudget` al mes. Las deudas
 * con interés desconocido se simulan sin interés y se advierte. Si el
 * presupuesto no cubre las cuotas mínimas pactadas, no es viable.
 */
export function simulatePayoff(
  debts: Pick<
    SnapshotDebt,
    | 'id'
    | 'creditorName'
    | 'remainingBalance'
    | 'interestRate'
    | 'interestRatePeriod'
    | 'installmentAmount'
    | 'currency'
  >[],
  monthlyBudget: number,
  strategy: PayoffStrategy
): PayoffResult {
  const warnings: string[] = [];
  const currencies = new Set(debts.map((d) => d.currency));
  if (currencies.size > 1) throw new Error('simulatePayoff requiere deudas de una sola moneda');

  const state = debts
    .filter((d) => {
      if (d.remainingBalance === null)
        warnings.push(`${d.creditorName}: saldo desconocido, no se incluye en la simulación.`);
      return d.remainingBalance !== null && d.remainingBalance > 0;
    })
    .map((d) => {
      const rate = monthlyRate(d);
      if (rate === null) warnings.push(`${d.creditorName}: interés desconocido, se simula sin intereses.`);
      return {
        id: d.id,
        name: d.creditorName,
        balance: d.remainingBalance ?? 0,
        rate: rate ?? 0,
        minimum: d.installmentAmount ?? 0,
      };
    });

  const minimums = sumMoney(state.map((d) => d.minimum));
  if (monthlyBudget < minimums) {
    return {
      strategy,
      feasible: false,
      months: null,
      totalInterest: 0,
      order: [],
      warnings: [...warnings, 'El monto mensual no cubre las cuotas mínimas pactadas.'],
    };
  }
  if (state.length === 0)
    return { strategy, feasible: true, months: 0, totalInterest: 0, order: [], warnings };

  const sorter =
    strategy === 'avalanche'
      ? (a: (typeof state)[number], b: (typeof state)[number]) => b.rate - a.rate || a.balance - b.balance
      : (a: (typeof state)[number], b: (typeof state)[number]) => a.balance - b.balance || b.rate - a.rate;

  let cents = state.map((d) => ({
    ...d,
    balance: Math.round(d.balance * 100),
    minimum: Math.round(d.minimum * 100),
  }));
  const budgetCents = Math.round(monthlyBudget * 100);
  let interestCents = 0;
  const order: string[] = [];
  let month = 0;

  while (cents.some((d) => d.balance > 0) && month < MAX_MONTHS) {
    month += 1;
    for (const d of cents) {
      if (d.balance <= 0) continue;
      const interest = Math.round(d.balance * d.rate);
      d.balance += interest;
      interestCents += interest;
    }
    let remaining = budgetCents;
    for (const d of cents) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minimum, d.balance, remaining);
      d.balance -= pay;
      remaining -= pay;
    }
    for (const d of [...cents].sort(sorter)) {
      if (remaining <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, remaining);
      d.balance -= pay;
      remaining -= pay;
    }
    for (const d of cents) if (d.balance <= 0 && !order.includes(d.name)) order.push(d.name);
    cents = cents.map((d) => ({ ...d, balance: Math.max(0, d.balance) }));
  }

  const feasible = cents.every((d) => d.balance <= 0);
  if (!feasible)
    warnings.push('Con este monto los intereses superan el pago: la deuda no se termina de pagar.');
  return {
    strategy,
    feasible,
    months: feasible ? month : null,
    totalInterest: interestCents / 100,
    order,
    warnings,
  };
}

/** Prioridad sugerida: vencidas, luego prioridad marcada, luego mayor interés conocido, luego menor saldo. */
export function suggestDebtOrder(debts: DebtView[]): DebtView[] {
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  return [...debts].sort((a, b) => {
    const overdue = Number(b.timeline === 'overdue') - Number(a.timeline === 'overdue');
    if (overdue) return overdue;
    const pa = a.priority ? priorityRank[a.priority] : 1;
    const pb = b.priority ? priorityRank[b.priority] : 1;
    if (pa !== pb) return pa - pb;
    const ra = monthlyRate(a) ?? -1;
    const rb = monthlyRate(b) ?? -1;
    if (ra !== rb) return rb - ra;
    return (a.remainingBalance ?? Number.MAX_SAFE_INTEGER) - (b.remainingBalance ?? Number.MAX_SAFE_INTEGER);
  });
}

export function nextDueWithin(debts: DebtView[], today: IsoDate, days: number): DebtView[] {
  const limit = addDaysIso(today, days);
  return debts.filter((d) => {
    const date = agreedDate(d);
    return d.timeline !== 'paid' && date !== null && date >= today && date <= limit;
  });
}
