import type { Budget, BudgetPeriod } from '@/domain/entities/Budget';

export interface BudgetInput {
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string | null;
  alertThresholdPercent: number;
}

export interface IBudgetRepository {
  list(userId: string): Promise<Budget[]>;
  create(userId: string, input: BudgetInput): Promise<Budget>;
  update(userId: string, id: string, input: BudgetInput): Promise<Budget>;
  delete(userId: string, id: string): Promise<void>;
}
