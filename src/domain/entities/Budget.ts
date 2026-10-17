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
  currency: string;
  /** Periodo en curso que mide v_budget_progress (mes o año actual dentro de start/end). */
  periodStart: string;
  periodEnd: string;
  /** Gastado en el periodo en curso, en la moneda del presupuesto (v_budget_progress, corregida en 0014). */
  spentAmount: number;
  availableAmount: number;
  spentPercent: number;
  createdAt: string;
}
