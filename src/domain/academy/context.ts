import { isAccountConfirmed } from '@/domain/finance/availability';
import { completeMonthsWithData, monthlyCapacity, monthlyEquivalent } from '@/domain/finance/cashflow';
import { isBalanceConfirmed, isOpenDebt } from '@/domain/finance/debts';
import { computeNetWorth } from '@/domain/finance/netWorth';
import { emergencyFundMonths } from '@/domain/finance/savings';
import { sumMoney } from '@/shared/lib/money';
import type { FinancialSnapshot } from '@/domain/finance/snapshot';
import type { LessonContext } from './lessons';

/** Datos reales que usan las lecciones para "Aplicación a tu situación". */
export function buildLessonContext(s: FinancialSnapshot): LessonContext {
  const myDebts = s.debts.filter((d) => d.direction === 'i_owe' && isOpenDebt(d));
  const subs = s.recurring.filter((r) => r.status === 'active' && r.kind === 'subscription');
  const capacity = monthlyCapacity(s, s.defaultCurrency);
  const emergency = s.goals.find(
    (g) => g.isEmergencyFund && g.status !== 'cancelled' && g.status !== 'archived'
  );
  return {
    accountsCount: s.accounts.length,
    unreconciledAccounts: s.accounts.filter((a) => !isAccountConfirmed(a, s.today)).length,
    openDebtsCount: myDebts.length,
    unconfirmedDebts: myDebts.filter((d) => !isBalanceConfirmed(d, s.today)).length,
    debtsWithUnknownInterest: myDebts.filter(
      (d) => d.interestRate === null || (d.interestRate > 0 && !d.interestRatePeriod)
    ).length,
    debtCurrencies: [...new Set(myDebts.map((d) => d.currency))],
    hasMonthlyBudget: s.budgets.some((b) => b.period === 'monthly'),
    essentialRecurringCount: s.recurring.filter((r) => r.status === 'active' && r.isEssential).length,
    subscriptionsCount: subs.length,
    subscriptionsMonthly: sumMoney(
      subs.filter((r) => r.currency === s.defaultCurrency).map(monthlyEquivalent)
    ),
    capacityStatus: capacity.status,
    hasEmergencyFund: !!emergency,
    emergencyFundMonths: emergency ? emergencyFundMonths(emergency.currentAmount, capacity.livingCost) : null,
    goalsCount: s.goals.filter((g) => g.status === 'active').length,
    netWorthIntegrity: computeNetWorth(s).integrity,
    monthsOfHistory: completeMonthsWithData(s),
    defaultCurrency: s.defaultCurrency,
  };
}
