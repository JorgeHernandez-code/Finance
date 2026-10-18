export type AccountType = 'cash' | 'bank' | 'digital_wallet' | 'credit_card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  initialBalance: number;
  /** initial_balance + ingresos − gastos ± transferencias (v_account_balances). */
  currentBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  /** Notas (p. ej. efectivo pendiente de contar, que NO se suma al saldo). */
  notes?: string | null;
  createdAt: string;
}
