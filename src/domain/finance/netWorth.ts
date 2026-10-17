import {
  addToTotals,
  sortCurrencies,
  subtractTotals,
  sumMoney,
  type CurrencyTotals,
} from '@/shared/lib/money';
import { daysBetween } from '@/shared/lib/dates';
import { consolidate, type Consolidated } from './fx';
import { isAccountConfirmed } from './availability';
import { isBalanceConfirmed, isOpenDebt } from './debts';
import type { FinancialSnapshot } from './snapshot';

export const VALUATION_FRESH_DAYS = 90;

export type Certainty = 'confirmed' | 'estimated';

export interface NetWorthLine {
  kind: 'account' | 'investment' | 'receivable' | 'debt' | 'negative_account';
  label: string;
  currency: string;
  amount: number;
  certainty: Certainty;
  note?: string;
}

export interface NetWorthCurrency {
  currency: string;
  assets: number;
  liabilities: number;
  net: number;
  confirmedNet: number;
}

export interface NetWorth {
  assets: NetWorthLine[];
  liabilities: NetWorthLine[];
  byCurrency: NetWorthCurrency[];
  netCop: Consolidated;
  confirmedNetCop: Consolidated;
  /** 0–100: porcentaje del valor total (activos + pasivos) que está confirmado. */
  integrity: number;
  warnings: string[];
}

/**
 * Patrimonio neto = activos − pasivos, por moneda.
 *
 * - Las reservas de ahorro NO se suman: ya están dentro del saldo de las cuentas.
 * - Una deuda cuenta por su saldo pendiente, nunca también por sus cuotas futuras.
 * - Las cuentas por cobrar (deudas "me deben") son activo una sola vez.
 * - Una cuenta con saldo negativo (p. ej. tarjeta) es pasivo, no activo negativo.
 */
export function computeNetWorth(snapshot: FinancialSnapshot): NetWorth {
  const { today } = snapshot;
  const assets: NetWorthLine[] = [];
  const liabilities: NetWorthLine[] = [];
  const warnings: string[] = [];

  for (const account of snapshot.accounts) {
    const certainty: Certainty = isAccountConfirmed(account, today) ? 'confirmed' : 'estimated';
    if (account.currentBalance >= 0) {
      assets.push({
        kind: 'account',
        label: account.name,
        currency: account.currency,
        amount: account.currentBalance,
        certainty,
      });
    } else {
      liabilities.push({
        kind: 'negative_account',
        label: account.name,
        currency: account.currency,
        amount: -account.currentBalance,
        certainty,
        note: 'Saldo negativo',
      });
    }
  }

  for (const inv of snapshot.investments) {
    const hasFreshValue =
      inv.latestValue !== null &&
      inv.latestValuationDate !== null &&
      daysBetween(inv.latestValuationDate, today) <= VALUATION_FRESH_DAYS;
    assets.push({
      kind: 'investment',
      label: inv.name,
      currency: inv.currency,
      amount: inv.latestValue ?? inv.amountInvested,
      certainty: hasFreshValue ? 'confirmed' : 'estimated',
      note:
        inv.latestValue === null
          ? 'Sin valoración: se usa el monto invertido'
          : hasFreshValue
            ? undefined
            : 'Valoración antigua',
    });
  }

  for (const debt of snapshot.debts.filter(isOpenDebt)) {
    const line: NetWorthLine = {
      kind: debt.direction === 'i_owe' ? 'debt' : 'receivable',
      label: debt.creditorName,
      currency: debt.currency,
      amount: debt.remainingBalance,
      certainty: isBalanceConfirmed(debt, today) ? 'confirmed' : 'estimated',
    };
    (debt.direction === 'i_owe' ? liabilities : assets).push(line);
  }

  const total = (lines: NetWorthLine[], onlyConfirmed = false) => {
    const t: CurrencyTotals = {};
    for (const l of lines)
      if (!onlyConfirmed || l.certainty === 'confirmed') addToTotals(t, l.currency, l.amount);
    return t;
  };

  const assetTotals = total(assets);
  const liabilityTotals = total(liabilities);
  const net = subtractTotals(assetTotals, liabilityTotals);
  const confirmedNet = subtractTotals(total(assets, true), total(liabilities, true));

  const byCurrency = sortCurrencies([...Object.keys(assetTotals), ...Object.keys(liabilityTotals)]).map(
    (currency) => ({
      currency,
      assets: assetTotals[currency] ?? 0,
      liabilities: liabilityTotals[currency] ?? 0,
      net: net[currency] ?? 0,
      confirmedNet: confirmedNet[currency] ?? 0,
    })
  );

  // Integridad: peso de lo confirmado sobre el valor absoluto total (en cada moneda, sin convertir).
  const all = [...assets, ...liabilities];
  const absTotal = sumMoney(all.map((l) => Math.abs(l.amount)));
  const absConfirmed = sumMoney(
    all.filter((l) => l.certainty === 'confirmed').map((l) => Math.abs(l.amount))
  );
  const integrity = absTotal === 0 ? 0 : Math.round((absConfirmed / absTotal) * 100);

  const unconfirmedAccounts = snapshot.accounts.filter((a) => !isAccountConfirmed(a, today)).length;
  if (unconfirmedAccounts)
    warnings.push(`${unconfirmedAccounts} cuenta(s) sin conciliar en los últimos 35 días.`);
  const unconfirmedDebts = snapshot.debts.filter(
    (d) => isOpenDebt(d) && !isBalanceConfirmed(d, today)
  ).length;
  if (unconfirmedDebts)
    warnings.push(`${unconfirmedDebts} deuda(s) con saldo estimado (sin confirmar con el acreedor).`);
  const noValuation = snapshot.investments.filter((i) => i.latestValue === null).length;
  if (noValuation) warnings.push(`${noValuation} inversión(es) sin valoración registrada.`);

  const netCop = consolidate(net, 'COP', snapshot.rates, today);
  if (!netCop.complete)
    warnings.push(
      `Falta la tasa de cambio de ${netCop.missingCurrencies.join(', ')} a COP: el total consolidado no la incluye.`
    );

  return {
    assets,
    liabilities,
    byCurrency,
    netCop,
    confirmedNetCop: consolidate(confirmedNet, 'COP', snapshot.rates, today),
    integrity,
    warnings,
  };
}
