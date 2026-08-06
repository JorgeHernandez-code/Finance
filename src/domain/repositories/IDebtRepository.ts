import type { Debt, DebtDirection, DebtStatus } from '@/domain/entities/Debt';

export interface DebtInput {
  creditorName: string;
  direction: DebtDirection;
  principalAmount: number;
  interestRate?: number | null;
  startDate: string;
  dueDate?: string | null;
  status: DebtStatus;
  notes?: string | null;
}

export interface DebtPaymentInput {
  amount: number;
  paymentDate: string;
  notes?: string | null;
}

/** debt_payments.debt_id es ON DELETE CASCADE: borrar una deuda borra también su historial de abonos (es su registro hijo, esperado). */
export interface IDebtRepository {
  list(userId: string): Promise<Debt[]>;
  create(userId: string, input: DebtInput): Promise<Debt>;
  update(userId: string, id: string, input: DebtInput): Promise<Debt>;
  delete(userId: string, id: string): Promise<void>;
  addPayment(userId: string, debtId: string, input: DebtPaymentInput): Promise<Debt>;
}
