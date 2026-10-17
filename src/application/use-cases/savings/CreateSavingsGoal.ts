import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import { savingsGoalInputSchema, type SavingsGoalInputDto } from '@/application/dto/savingsGoal';

export class CreateSavingsGoal {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawInput: SavingsGoalInputDto): Promise<void> {
    const input = savingsGoalInputSchema.parse(rawInput);
    await this.savingsGoalRepository.create(userId, input);
  }
}
