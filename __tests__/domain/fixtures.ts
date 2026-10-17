import {
  emptySnapshot,
  type FinancialSnapshot,
  type SnapshotAccount,
  type SnapshotDebt,
  type SnapshotGoal,
  type SnapshotRecurring,
  type SnapshotTransaction,
} from '@/domain/finance/snapshot';

export const TODAY = '2026-10-15'; // jueves; semana ISO 2026-10-12 … 2026-10-18

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

export function snap(partial: Partial<FinancialSnapshot> = {}): FinancialSnapshot {
  return { ...emptySnapshot(TODAY), ...partial };
}

export function account(p: Partial<SnapshotAccount> = {}): SnapshotAccount {
  return {
    id: id('acc'),
    name: 'Cuenta',
    type: 'bank',
    currency: 'COP',
    country: null,
    currentBalance: 0,
    createdAt: '2026-01-01T10:00:00Z',
    lastReconciledOn: null,
    lastReconciliationDifference: null,
    ...p,
  };
}

export function debt(p: Partial<SnapshotDebt> = {}): SnapshotDebt {
  return {
    id: id('debt'),
    creditorName: 'Acreedor',
    direction: 'i_owe',
    kind: 'bank_loan',
    currency: 'COP',
    country: null,
    principalAmount: 1000,
    remainingBalance: 1000,
    totalPaid: 0,
    totalInterestAndFees: 0,
    interestRate: null,
    interestRatePeriod: null,
    startDate: '2026-01-01',
    dueDate: null,
    nextPaymentDate: null,
    installmentAmount: null,
    installmentsTotal: null,
    status: 'active',
    priority: null,
    negotiable: 'unknown',
    balanceConfirmedAmount: null,
    balanceConfirmedAt: null,
    paymentsSinceConfirmation: 0,
    lastPaymentDate: null,
    notes: null,
    createdAt: '2026-01-01T10:00:00Z',
    ...p,
  };
}

export function goal(p: Partial<SnapshotGoal> = {}): SnapshotGoal {
  return {
    id: id('goal'),
    name: 'Meta',
    targetAmount: 1000,
    currency: 'COP',
    targetDate: null,
    status: 'active',
    currentAmount: 0,
    accountId: null,
    priority: 3,
    plannedMonthlyContribution: null,
    isEmergencyFund: false,
    createdAt: '2026-01-01T10:00:00Z',
    lastContributionDate: null,
    ...p,
  };
}

export function tx(p: Partial<SnapshotTransaction> = {}): SnapshotTransaction {
  const date = p.date ?? TODAY;
  return {
    id: id('tx'),
    type: 'expense',
    transferDirection: null,
    amount: 100,
    currency: 'COP',
    date,
    createdAt: `${date}T12:00:00Z`,
    accountId: 'acc-x',
    categoryId: 'cat-x',
    categoryName: 'Comida',
    categoryColor: null,
    subscriptionId: null,
    description: 'mov',
    ...p,
  };
}

export function recurring(p: Partial<SnapshotRecurring> = {}): SnapshotRecurring {
  return {
    id: id('rec'),
    name: 'Recurrente',
    kind: 'subscription',
    amount: 100,
    currency: 'COP',
    billingCycle: 'monthly',
    nextBillingDate: '2026-10-20',
    status: 'active',
    isEssential: false,
    debtId: null,
    lastReviewedAt: null,
    ...p,
  };
}
