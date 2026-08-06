import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
import { updateSavingsGoalSchema, type UpdateSavingsGoalInput } from '@/application/dto/savingsGoal';

export class UpdateSavingsGoal {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawInput: UpdateSavingsGoalInput): Promise<SavingsGoal> {
    const { id, ...rest } = updateSavingsGoalSchema.parse(rawInput);
    return this.savingsGoalRepository.update(userId, id, rest);
  }
}
