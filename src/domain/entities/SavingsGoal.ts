export type SavingsGoalStatus = 'active' | 'completed' | 'archived';

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  icon: string;
  color: string;
  status: SavingsGoalStatus;
  /** De v_savings_progress. */
  currentAmount: number;
  progressPercent: number;
  createdAt: string;
}
