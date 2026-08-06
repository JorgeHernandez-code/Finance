import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';

export class ListSavingsGoals {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string): Promise<SavingsGoal[]> {
    return this.savingsGoalRepository.list(userId);
  }
}
