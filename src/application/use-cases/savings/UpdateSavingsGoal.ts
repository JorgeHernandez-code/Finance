import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import { updateSavingsGoalSchema, type UpdateSavingsGoalInput } from '@/application/dto/savingsGoal';

export class UpdateSavingsGoal {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawInput: UpdateSavingsGoalInput): Promise<void> {
    const { id, ...rest } = updateSavingsGoalSchema.parse(rawInput);
    await this.savingsGoalRepository.update(userId, id, rest);
  }
}
