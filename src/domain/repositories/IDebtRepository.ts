import type { Debt, DebtDirection, DebtKind, DebtPayment, DebtStatus } from '@/domain/entities/Debt';

export interface DebtInput {
  creditorName: string;
  direction: DebtDirection;
  kind: DebtKind;
  currency: string;
  country?: string | null;
  principalAmount: number;
  interestRate?: number | null;
  interestRatePeriod?: 'monthly' | 'annual' | null;
  startDate: string;
  dueDate?: string | null;
  nextPaymentDate?: string | null;
  installmentAmount?: number | null;
  installmentsTotal?: number | null;
  status: DebtStatus;
  priority?: 'high' | 'medium' | 'low' | null;
  negotiable: 'yes' | 'no' | 'unknown';
  notes?: string | null;
}

export interface DebtPaymentInput {
  amount: number;
  paymentDate: string;
  interestAmount?: number | null;
  feesAmount?: number | null;
  notes?: string | null;
  /** Cuenta de la que salió el dinero: crea el movimiento enlazado (una sola vez). */
  accountId?: string | null;
  categoryId?: string | null;
  idempotencyKey: string;
}

export interface DebtBalanceConfirmation {
  amount: number;
  confirmedAt: string;
}

/** debt_payments.debt_id es ON DELETE CASCADE: borrar una deuda borra también su historial de abonos (es su registro hijo, esperado). */
export interface IDebtRepository {
  list(userId: string): Promise<Debt[]>;
  listPayments(userId: string, debtId: string): Promise<DebtPayment[]>;
  create(userId: string, input: DebtInput): Promise<Debt>;
  update(userId: string, id: string, input: DebtInput): Promise<Debt>;
  confirmBalance(userId: string, id: string, input: DebtBalanceConfirmation): Promise<void>;
  delete(userId: string, id: string): Promise<void>;
  addPayment(userId: string, debtId: string, input: DebtPaymentInput): Promise<void>;
}
