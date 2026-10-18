/**
 * Instantánea de los datos financieros REALES del usuario: lo único que
 * consumen los cálculos de Finance 2.0 (dashboard, patrimonio, plan, índice
 * de salud, retos). La arma SupabaseFinancialSnapshotRepository; los cálculos
 * son funciones puras sobre ella, sin acceso a red ni a la base de datos.
 *
 * Nada aquí se inventa: un dato desconocido es `null` y los cálculos lo
 * tratan como "pendiente de confirmar".
 */
import type { IsoDate } from '@/shared/lib/dates';

export type DebtKind =
  | 'personal_loan'
  | 'bank_loan'
  | 'credit_card'
  | 'family'
  | 'friend'
  | 'commercial'
  | 'tax'
  | 'fine'
  | 'utility'
  | 'state_loan'
  | 'other';

export type DebtStatusValue = 'active' | 'paid' | 'overdue' | 'negotiating' | 'agreement';
export type GoalStatusValue = 'active' | 'completed' | 'archived' | 'paused' | 'cancelled';
export type BillingCycle = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'yearly';
export type RecurringKind =
  | 'subscription'
  | 'rent'
  | 'utilities'
  | 'food'
  | 'transport'
  | 'phone'
  | 'internet'
  | 'loan_installment'
  | 'personal'
  | 'business'
  | 'extraordinary'
  | 'other';

export interface SnapshotAccount {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'digital_wallet' | 'credit_card' | 'other';
  currency: string;
  country: string | null;
  currentBalance: number;
  createdAt: string;
  lastReconciledOn: IsoDate | null;
  lastReconciliationDifference: number | null;
}

export interface SnapshotReconciliation {
  accountId: string;
  date: IsoDate;
  difference: number;
}

export interface SnapshotDebt {
  id: string;
  creditorName: string;
  direction: 'i_owe' | 'owed_to_me';
  kind: DebtKind;
  currency: string;
  country: string | null;
  /** null = desconocido (solo se sabe la cuota). */
  principalAmount: number | null;
  /** null = saldo desconocido: no se suma a ningún total y se marca como pendiente. */
  remainingBalance: number | null;
  /** Importe aproximado informado por el usuario. */
  amountIsEstimate: boolean;
  /** own = propia; shared = compartida; third_party = a nombre de un tercero que el usuario asume. */
  responsibility: 'own' | 'shared' | 'third_party';
  legalHolder: string | null;
  /** Número de la próxima cuota según lo informado. */
  nextInstallmentNumber: number | null;
  totalPaid: number;
  totalInterestAndFees: number;
  interestRate: number | null;
  interestRatePeriod: 'monthly' | 'annual' | null;
  startDate: IsoDate;
  dueDate: IsoDate | null;
  nextPaymentDate: IsoDate | null;
  installmentAmount: number | null;
  installmentsTotal: number | null;
  status: DebtStatusValue;
  priority: 'high' | 'medium' | 'low' | null;
  negotiable: 'yes' | 'no' | 'unknown';
  balanceConfirmedAmount: number | null;
  balanceConfirmedAt: IsoDate | null;
  paymentsSinceConfirmation: number;
  lastPaymentDate: IsoDate | null;
  notes: string | null;
  createdAt: string;
}

export interface SnapshotDebtPayment {
  id: string;
  debtId: string;
  amount: number;
  paymentDate: IsoDate;
  interestAmount: number | null;
  feesAmount: number | null;
  transactionId: string | null;
  createdAt: string;
}

export interface SnapshotGoal {
  id: string;
  name: string;
  /** null = pendiente de cotización. */
  targetAmount: number | null;
  currency: string;
  targetDate: IsoDate | null;
  status: GoalStatusValue;
  currentAmount: number;
  accountId: string | null;
  priority: number;
  plannedMonthlyContribution: number | null;
  isEmergencyFund: boolean;
  createdAt: string;
  lastContributionDate: IsoDate | null;
}

export interface SnapshotContribution {
  goalId: string;
  amount: number;
  kind: 'deposit' | 'withdrawal';
  date: IsoDate;
  createdAt: string;
}

export interface SnapshotRecurring {
  id: string;
  name: string;
  kind: RecurringKind;
  amount: number;
  currency: string;
  /** null = frecuencia desconocida. */
  billingCycle: BillingCycle | null;
  /** null = fecha de cobro desconocida. */
  nextBillingDate: IsoDate | null;
  amountIsEstimate: boolean;
  /** false = frecuencia informada pero pendiente de confirmar. */
  cycleConfirmed: boolean;
  status: 'active' | 'paused' | 'cancelled';
  isEssential: boolean;
  debtId: string | null;
  lastReviewedAt: IsoDate | null;
}

export interface SnapshotBudget {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  currency: string;
  period: 'monthly' | 'yearly';
  spent: number;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  createdAt: string;
}

export interface SnapshotTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  transferDirection: 'in' | 'out' | null;
  amount: number;
  currency: string;
  date: IsoDate;
  createdAt: string;
  accountId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  subscriptionId: string | null;
  description: string;
}

export interface SnapshotRate {
  base: string;
  quote: string;
  rate: number;
  date: IsoDate;
}

export interface SnapshotInvestment {
  id: string;
  name: string;
  currency: string;
  amountInvested: number;
  latestValue: number | null;
  latestValuationDate: IsoDate | null;
}

export interface SnapshotCheckin {
  actionKey: string;
  periodStart: IsoDate;
  completedAt: string;
}

export interface SnapshotLessonProgress {
  lessonId: string;
  quizPassed: boolean;
  completedAt: string | null;
}

export interface SnapshotXpEvent {
  sourceType: 'lesson' | 'challenge' | 'achievement';
  sourceKey: string;
  points: number;
  description: string;
  earnedAt: string;
}

export interface FinancialSnapshot {
  today: IsoDate;
  defaultCurrency: string;
  riskTolerance: 'low' | 'medium' | 'high' | null;
  accounts: SnapshotAccount[];
  reconciliations: SnapshotReconciliation[];
  debts: SnapshotDebt[];
  debtPayments: SnapshotDebtPayment[];
  goals: SnapshotGoal[];
  contributions: SnapshotContribution[];
  recurring: SnapshotRecurring[];
  budgets: SnapshotBudget[];
  /** Movimientos no eliminados de los últimos ~13 meses. */
  transactions: SnapshotTransaction[];
  rates: SnapshotRate[];
  investments: SnapshotInvestment[];
  checkins: SnapshotCheckin[];
  lessons: SnapshotLessonProgress[];
  xpEvents: SnapshotXpEvent[];
  categoryCount: number;
}

export function emptySnapshot(today: IsoDate, defaultCurrency = 'COP'): FinancialSnapshot {
  return {
    today,
    defaultCurrency,
    riskTolerance: null,
    accounts: [],
    reconciliations: [],
    debts: [],
    debtPayments: [],
    goals: [],
    contributions: [],
    recurring: [],
    budgets: [],
    transactions: [],
    rates: [],
    investments: [],
    checkins: [],
    lessons: [],
    xpEvents: [],
    categoryCount: 0,
  };
}
