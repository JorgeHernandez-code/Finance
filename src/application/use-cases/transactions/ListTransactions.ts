import type { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import type { TransactionListResult } from '@/domain/entities/Transaction';
import { transactionFiltersSchema, type TransactionFiltersDto } from '@/application/dto/transaction';

export class ListTransactions {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(userId: string, rawFilters: Partial<TransactionFiltersDto>): Promise<TransactionListResult> {
    const filters = transactionFiltersSchema.parse(rawFilters);
    return this.transactionRepository.list(userId, filters);
  }
}
