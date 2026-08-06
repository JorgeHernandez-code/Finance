import { z } from 'zod';
import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';

const idSchema = z.string().uuid();

export class DeleteSavingsGoal {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.savingsGoalRepository.delete(userId, id);
  }
}
