export type AccountType = 'cash' | 'bank' | 'digital_wallet' | 'credit_card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  initialBalance: number;
  /** initial_balance + suma de ingresos/gastos (v_account_balances) — no incluye transferencias todavía, ver Transaction.ts. */
  currentBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
}
