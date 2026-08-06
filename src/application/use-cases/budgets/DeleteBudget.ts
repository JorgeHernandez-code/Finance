import { z } from 'zod';
import type { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';

const idSchema = z.string().uuid();

export class DeleteBudget {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.budgetRepository.delete(userId, id);
  }
}
