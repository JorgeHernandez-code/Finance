import type { CategoryBreakdownItem, MonthlyPoint, NetWorthSummary } from '@/domain/entities/DashboardSummary';

export interface IDashboardRepository {
  getNetWorth(userId: string): Promise<NetWorthSummary | null>;
  /** Últimos `months` meses, ordenados ascendente por fecha, incluyendo meses sin movimientos como ceros. */
  getMonthlyHistory(userId: string, months: number): Promise<MonthlyPoint[]>;
  getCategoryBreakdown(userId: string, monthStart: string): Promise<CategoryBreakdownItem[]>;
}
