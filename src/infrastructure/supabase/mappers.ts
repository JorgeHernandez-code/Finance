import type { Database } from '@/shared/types/database';
import type { SnapshotDebt, SnapshotGoal, SnapshotRecurring } from '@/domain/finance/snapshot';

type DebtRow = Database['public']['Tables']['debts']['Row'];
type DebtBalanceRow = Database['public']['Views']['v_debt_balance']['Row'];
type GoalRow = Database['public']['Tables']['savings_goals']['Row'];
type GoalProgressRow = Database['public']['Views']['v_savings_progress']['Row'];
type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];

/**
 * PostgREST entrega `numeric` como number (o string en algunos drivers);
 * se normaliza aquí, una sola vez, para todo el dominio.
 */
export const num = (value: number | string | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);
export const numOrNull = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value);

export function mapDebt(row: DebtRow, balance?: Partial<DebtBalanceRow>): SnapshotDebt {
  return {
    id: row.id,
    creditorName: row.creditor_name,
    direction: row.direction,
    kind: row.kind ?? 'other',
    currency: row.currency ?? 'COP',
    country: row.country ?? null,
    principalAmount: numOrNull(row.principal_amount),
    // null = saldo desconocido (sin monto original ni confirmación).
    remainingBalance:
      balance && balance.remaining_balance !== undefined
        ? numOrNull(balance.remaining_balance)
        : numOrNull(row.balance_confirmed_amount ?? row.principal_amount),
    amountIsEstimate: row.amount_is_estimate ?? false,
    responsibility: row.responsibility ?? 'own',
    legalHolder: row.legal_holder ?? null,
    nextInstallmentNumber: row.next_installment_number ?? null,
    totalPaid: num(balance?.total_paid),
    totalInterestAndFees: num(balance?.total_interest_and_fees),
    interestRate: numOrNull(row.interest_rate),
    interestRatePeriod: row.interest_rate_period ?? null,
    startDate: row.start_date,
    dueDate: row.due_date,
    nextPaymentDate: row.next_payment_date ?? null,
    installmentAmount: numOrNull(row.installment_amount),
    installmentsTotal: row.installments_total ?? null,
    status: row.status,
    priority: row.priority ?? null,
    negotiable: row.negotiable ?? 'unknown',
    balanceConfirmedAmount: numOrNull(row.balance_confirmed_amount),
    balanceConfirmedAt: row.balance_confirmed_at ?? null,
    paymentsSinceConfirmation: num(balance?.payments_since_confirmation),
    lastPaymentDate: balance?.last_payment_date ?? null,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function mapGoal(row: GoalRow, progress?: Partial<GoalProgressRow>): SnapshotGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: numOrNull(row.target_amount),
    currency: row.currency ?? 'COP',
    targetDate: row.target_date,
    status: row.status,
    currentAmount: num(progress?.current_amount),
    accountId: row.account_id ?? null,
    priority: row.priority ?? 3,
    plannedMonthlyContribution: numOrNull(row.planned_monthly_contribution),
    isEmergencyFund: row.is_emergency_fund ?? false,
    createdAt: row.created_at,
    lastContributionDate: progress?.last_contribution_date ?? null,
  };
}

export function mapRecurring(row: SubscriptionRow): SnapshotRecurring {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind ?? 'subscription',
    amount: num(row.amount),
    currency: row.currency,
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    status: row.status,
    isEssential: row.is_essential ?? false,
    debtId: row.debt_id ?? null,
    lastReviewedAt: row.last_reviewed_at ?? null,
    amountIsEstimate: row.amount_is_estimate ?? false,
    cycleConfirmed: row.cycle_confirmed ?? true,
  };
}

/** Errores de Postgres que el usuario puede entender, sin filtrar detalles internos. */
export function friendlyDbError(message: string, fallback: string): string {
  if (/duplicate key|unique/i.test(message)) return 'Este registro ya existe (posible envío duplicado).';
  if (/row-level security/i.test(message)) return 'No tienes permiso para esta operación.';
  if (/check constraint/i.test(message)) return 'Algún dato no es válido.';
  const known = [
    'Cuenta no encontrada',
    'Deuda no encontrada',
    'monedas distintas',
    'deben ser distintas',
    'deben coincidir',
    'mayores a 0',
  ];
  if (known.some((k) => message.includes(k))) return message;
  return fallback;
}
