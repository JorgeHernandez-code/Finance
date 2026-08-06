import { z } from 'zod';
import type { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';

const idSchema = z.string().uuid();

export class DeleteTransaction {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.transactionRepository.softDelete(userId, id);
  }
}
