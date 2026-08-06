import type { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import type { Transaction } from '@/domain/entities/Transaction';
import { updateTransactionSchema, type UpdateTransactionInput } from '@/application/dto/transaction';

export class UpdateTransaction {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(userId: string, rawInput: UpdateTransactionInput): Promise<Transaction> {
    const { id, ...rest } = updateTransactionSchema.parse(rawInput);
    return this.transactionRepository.update(userId, id, rest);
  }
}
