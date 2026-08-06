import type { MonthlyPoint, CategoryBreakdownItem } from '@/domain/entities/DashboardSummary';

export interface AccountBreakdownItem {
  accountId: string;
  name: string;
  income: number;
  expense: number;
  balance: number;
}

export interface ReportSummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  monthlySeries: MonthlyPoint[];
  /** Solo gastos, sumados en todo el año (no por mes) — para el donut de categorías del reporte. */
  categoryBreakdown: CategoryBreakdownItem[];
  accountBreakdown: AccountBreakdownItem[];
}

export interface ReportTransactionRow {
  date: string;
  type: 'income' | 'expense';
  description: string;
  categoryName: string | null;
  accountName: string;
  clientName: string | null;
  amount: number;
}
