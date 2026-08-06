import type { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import type { Budget } from '@/domain/entities/Budget';
import { budgetInputSchema, type BudgetInputDto } from '@/application/dto/budget';

export class CreateBudget {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(userId: string, rawInput: BudgetInputDto): Promise<Budget> {
    const input = budgetInputSchema.parse(rawInput);
    return this.budgetRepository.create(userId, input);
  }
}
