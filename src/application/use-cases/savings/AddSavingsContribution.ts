import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import {
  savingsContributionInputSchema,
  type SavingsContributionInputDto,
} from '@/application/dto/savingsGoal';

export class AddSavingsContribution {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawInput: SavingsContributionInputDto): Promise<void> {
    const { goalId, ...rest } = savingsContributionInputSchema.parse(rawInput);
    await this.savingsGoalRepository.addContribution(userId, goalId, rest);
  }
}
