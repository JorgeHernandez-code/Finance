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
  /** Generada por el formulario al abrirse: un doble envío no duplica el movimiento. */
  idempotencyKey?: string | null;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  /** Monto que sale (moneda de la cuenta origen). */
  amountOut: number;
  /** Monto que entra (moneda de la cuenta destino); igual a amountOut si es la misma moneda. */
  amountIn: number;
  description: string;
  notes?: string | null;
  transactionDate: string;
  idempotencyKey: string;
}

export interface ITransactionRepository {
  list(userId: string, filters: TransactionFilters): Promise<TransactionListResult>;
  create(userId: string, input: TransactionInput): Promise<Transaction>;
  createTransfer(input: TransferInput): Promise<void>;
  update(userId: string, id: string, input: TransactionInput): Promise<Transaction>;
  softDelete(userId: string, id: string): Promise<void>;
}
