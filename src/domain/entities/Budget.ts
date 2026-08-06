export type BudgetPeriod = 'monthly' | 'yearly';

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string | null;
  alertThresholdPercent: number;
  /** De v_budget_progress — cuánto se ha gastado en la categoría desde start_date. */
  spentAmount: number;
  availableAmount: number;
  spentPercent: number;
  createdAt: string;
}
