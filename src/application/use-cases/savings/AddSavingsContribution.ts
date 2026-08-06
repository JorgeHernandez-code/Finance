import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
import { savingsContributionInputSchema, type SavingsContributionInputDto } from '@/application/dto/savingsGoal';

export class AddSavingsContribution {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawInput: SavingsContributionInputDto): Promise<SavingsGoal> {
    const { goalId, ...rest } = savingsContributionInputSchema.parse(rawInput);
    return this.savingsGoalRepository.addContribution(userId, goalId, rest);
  }
}
