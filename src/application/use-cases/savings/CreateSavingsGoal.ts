import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
import { savingsGoalInputSchema, type SavingsGoalInputDto } from '@/application/dto/savingsGoal';

export class CreateSavingsGoal {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawInput: SavingsGoalInputDto): Promise<SavingsGoal> {
    const input = savingsGoalInputSchema.parse(rawInput);
    return this.savingsGoalRepository.create(userId, input);
  }
}
