/**
 * Ingreso o gasto. Las transferencias entre cuentas (0013) son dos filas
 * 'transfer' enlazadas (salida + entrada); en la lista se muestran con
 * isTransfer = true y `type` indica el sentido (income = entra, expense = sale),
 * pero no cuentan como ingreso ni gasto en ningún cálculo.
 */
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  clientId: string | null;
  clientName: string | null;
  type: TransactionType;
  isTransfer: boolean;
  transferPairId: string | null;
  amount: number;
  currency: string;
  description: string;
  notes: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface TransactionListResult {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}
