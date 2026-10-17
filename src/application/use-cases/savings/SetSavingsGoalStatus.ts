import type { ISavingsGoalRepository } from '@/domain/repositories/ISavingsGoalRepository';
import { setGoalStatusSchema } from '@/application/dto/savingsGoal';

/** Pausar, cancelar o reactivar una meta sin borrar su historial de aportes. */
export class SetSavingsGoalStatus {
  constructor(private readonly savingsGoalRepository: ISavingsGoalRepository) {}

  async execute(userId: string, rawInput: { id: string; status: string }): Promise<void> {
    const { id, status } = setGoalStatusSchema.parse(rawInput);
    await this.savingsGoalRepository.setStatus(userId, id, status);
  }
}
