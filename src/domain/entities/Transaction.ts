/**
 * Fase 7: transacciones. El tipo 'transfer' existe en el esquema (0004_transactions.sql)
 * pero su contabilidad de doble entrada (qué cuenta resta, cuál suma, cómo lo
 * reflejan las vistas agregadas) se deja fuera de este alcance a propósito —
 * ver la nota en supabase/migrations/0011_views.sql. Implementarlo a medias
 * dejaría saldos de cuentas incorrectos, que es peor que no tenerlo. Por ahora
 * el formulario solo permite crear 'income' y 'expense'.
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
