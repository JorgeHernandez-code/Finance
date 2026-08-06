export interface NetWorthSummary {
  available: number;
  invested: number;
  saved: number;
  debt: number;
  netWorth: number;
}

export interface MonthlyPoint {
  month: string; // 'YYYY-MM-DD' (primer día del mes)
  income: number;
  expense: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  color: string;
  total: number;
}

export interface DashboardSummary {
  netWorth: NetWorthSummary;
  currentMonth: { income: number; expense: number; balance: number };
  /** % de cambio vs. el mes anterior. undefined si no hay mes anterior con datos. */
  trend: { income?: number; expense?: number; balance?: number };
  monthlyHistory: MonthlyPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
}
