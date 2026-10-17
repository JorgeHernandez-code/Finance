import {
  addToTotals,
  sumMoney,
  subtractMoney,
  sortCurrencies,
  type CurrencyTotals,
} from '@/shared/lib/money';
import { daysBetween } from '@/shared/lib/dates';
import { consolidate, type Consolidated } from './fx';
import type { FinancialSnapshot, SnapshotAccount, SnapshotGoal } from './snapshot';

/** Un saldo conciliado hace más de esto se considera pendiente de confirmar. */
export const RECONCILIATION_FRESH_DAYS = 35;

/** Estados de meta cuyo dinero sigue apartado dentro de las cuentas. */
const RESERVING_STATUSES: SnapshotGoal['status'][] = ['active', 'paused', 'completed'];

export function isReserving(goal: SnapshotGoal): boolean {
  return RESERVING_STATUSES.includes(goal.status) && goal.currentAmount > 0;
}

export function isAccountConfirmed(account: SnapshotAccount, today: string): boolean {
  return (
    account.lastReconciledOn !== null &&
    daysBetween(account.lastReconciledOn, today) <= RECONCILIATION_FRESH_DAYS
  );
}

export interface AccountAvailability extends SnapshotAccount {
  confirmed: boolean;
  reserved: number;
}

export interface CurrencyAvailability {
  currency: string;
  total: number;
  confirmed: number;
  pendingConfirmation: number;
  reserved: number;
  /** total − reservado. Negativo = hay más reservado que dinero. */
  free: number;
}

export interface Availability {
  accounts: AccountAvailability[];
  byCurrency: CurrencyAvailability[];
  totalCop: Consolidated;
  freeCop: Consolidated;
  /** Reservas de metas sin cuenta asociada, por moneda (se descuentan del total de esa moneda). */
  unassignedReservations: CurrencyTotals;
  hasAccounts: boolean;
}

/**
 * Dinero disponible. Las reservas de ahorro son dinero que YA está dentro
 * de las cuentas: se restan para obtener el dinero libre y nunca se suman
 * encima del saldo.
 */
export function computeAvailability(snapshot: FinancialSnapshot): Availability {
  const { today } = snapshot;
  const reservedByAccount = new Map<string, number>();
  const unassignedReservations: CurrencyTotals = {};

  for (const goal of snapshot.goals.filter(isReserving)) {
    const account = goal.accountId ? snapshot.accounts.find((a) => a.id === goal.accountId) : undefined;
    if (account && account.currency === goal.currency) {
      reservedByAccount.set(
        account.id,
        sumMoney([reservedByAccount.get(account.id) ?? 0, goal.currentAmount])
      );
    } else {
      addToTotals(unassignedReservations, goal.currency, goal.currentAmount);
    }
  }

  const accounts: AccountAvailability[] = snapshot.accounts.map((account) => ({
    ...account,
    confirmed: isAccountConfirmed(account, today),
    reserved: reservedByAccount.get(account.id) ?? 0,
  }));

  const currencies = sortCurrencies([
    ...accounts.map((a) => a.currency),
    ...Object.keys(unassignedReservations),
  ]);
  const byCurrency = currencies.map((currency): CurrencyAvailability => {
    const inCurrency = accounts.filter((a) => a.currency === currency);
    const total = sumMoney(inCurrency.map((a) => a.currentBalance));
    const confirmed = sumMoney(inCurrency.filter((a) => a.confirmed).map((a) => a.currentBalance));
    const reserved = sumMoney([...inCurrency.map((a) => a.reserved), unassignedReservations[currency] ?? 0]);
    return {
      currency,
      total,
      confirmed,
      pendingConfirmation: subtractMoney(total, confirmed),
      reserved,
      free: subtractMoney(total, reserved),
    };
  });

  const totals = Object.fromEntries(byCurrency.map((c) => [c.currency, c.total]));
  const frees = Object.fromEntries(byCurrency.map((c) => [c.currency, c.free]));

  return {
    accounts,
    byCurrency,
    totalCop: consolidate(totals, 'COP', snapshot.rates, today),
    freeCop: consolidate(frees, 'COP', snapshot.rates, today),
    unassignedReservations,
    hasAccounts: accounts.length > 0,
  };
}
