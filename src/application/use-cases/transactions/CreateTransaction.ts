import type { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import type { Transaction } from '@/domain/entities/Transaction';
import { createTransactionSchema, type CreateTransactionInput } from '@/application/dto/transaction';

export class CreateTransaction {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(userId: string, rawInput: CreateTransactionInput): Promise<Transaction> {
    const input = createTransactionSchema.parse(rawInput);
    return this.transactionRepository.create(userId, input);
  }
}
