export type DebtDirection = 'i_owe' | 'owed_to_me';
export type DebtStatus = 'active' | 'paid' | 'overdue';

export interface Debt {
  id: string;
  creditorName: string;
  direction: DebtDirection;
  principalAmount: number;
  interestRate: number | null;
  startDate: string;
  dueDate: string | null;
  status: DebtStatus;
  notes: string | null;
  /** De v_debt_balance. */
  totalPaid: number;
  remainingBalance: number;
  createdAt: string;
}
