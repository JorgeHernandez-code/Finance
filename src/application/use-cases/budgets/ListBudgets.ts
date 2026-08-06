import type { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import type { Budget } from '@/domain/entities/Budget';

export class ListBudgets {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(userId: string): Promise<Budget[]> {
    return this.budgetRepository.list(userId);
  }
}
