import type { SavingsGoal, SavingsGoalStatus } from '@/domain/entities/SavingsGoal';

export interface SavingsGoalInput {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
  icon: string;
  color: string;
  status: SavingsGoalStatus;
}

export interface SavingsContributionInput {
  amount: number;
  contributionDate: string;
  notes?: string | null;
}

/** savings_contributions.savings_goal_id es ON DELETE CASCADE: borrar una meta borra su historial de aportes (registro hijo, esperado). */
export interface ISavingsGoalRepository {
  list(userId: string): Promise<SavingsGoal[]>;
  create(userId: string, input: SavingsGoalInput): Promise<SavingsGoal>;
  update(userId: string, id: string, input: SavingsGoalInput): Promise<SavingsGoal>;
  delete(userId: string, id: string): Promise<void>;
  addContribution(userId: string, goalId: string, input: SavingsContributionInput): Promise<SavingsGoal>;
}
