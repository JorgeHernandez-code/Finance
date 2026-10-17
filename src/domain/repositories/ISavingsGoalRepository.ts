import type { SavingsGoal, SavingsGoalStatus } from '@/domain/entities/SavingsGoal';

export interface SavingsGoalInput {
  name: string;
  targetAmount: number;
  currency: string;
  targetDate?: string | null;
  accountId?: string | null;
  priority: number;
  plannedMonthlyContribution?: number | null;
  isEmergencyFund: boolean;
  icon: string;
  color: string;
  status: SavingsGoalStatus;
}

export interface SavingsContributionInput {
  amount: number;
  kind: 'deposit' | 'withdrawal';
  contributionDate: string;
  notes?: string | null;
  idempotencyKey: string;
}

/**
 * savings_contributions.savings_goal_id es ON DELETE CASCADE: borrar una meta
 * borra su historial. Por eso la UI ofrece pausar o cancelar (conserva el historial).
 */
export interface ISavingsGoalRepository {
  list(userId: string): Promise<SavingsGoal[]>;
  create(userId: string, input: SavingsGoalInput): Promise<void>;
  update(userId: string, id: string, input: SavingsGoalInput): Promise<void>;
  setStatus(userId: string, id: string, status: SavingsGoalStatus): Promise<void>;
  delete(userId: string, id: string): Promise<void>;
  addContribution(userId: string, goalId: string, input: SavingsContributionInput): Promise<void>;
}
