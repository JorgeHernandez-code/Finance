import type { Transaction, TransactionListResult, TransactionType } from '@/domain/entities/Transaction';

/**
 * Solo tipos planos aquí (no los schemas de Zod de application/dto) — domain
 * no depende de application, es al revés. application/dto/transaction.ts
 * define los schemas y sus tipos inferidos calzan estructuralmente con estos.
 */
export interface TransactionFilters {
  search?: string;
  type?: 'all' | TransactionType;
  accountId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface TransactionInput {
  accountId: string;
  categoryId: string;
  clientId?: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  notes?: string | null;
  transactionDate: string;
}

export interface ITransactionRepository {
  list(userId: string, filters: TransactionFilters): Promise<TransactionListResult>;
  create(userId: string, input: TransactionInput): Promise<Transaction>;
  update(userId: string, id: string, input: TransactionInput): Promise<Transaction>;
  softDelete(userId: string, id: string): Promise<void>;
}
