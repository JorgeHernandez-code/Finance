import type { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import type { Budget } from '@/domain/entities/Budget';
import { updateBudgetSchema, type UpdateBudgetInput } from '@/application/dto/budget';

export class UpdateBudget {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(userId: string, rawInput: UpdateBudgetInput): Promise<Budget> {
    const { id, ...rest } = updateBudgetSchema.parse(rawInput);
    return this.budgetRepository.update(userId, id, rest);
  }
}
