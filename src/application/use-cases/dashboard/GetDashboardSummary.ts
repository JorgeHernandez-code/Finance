import { format, startOfMonth } from 'date-fns';
import type { IDashboardRepository } from '@/domain/repositories/IDashboardRepository';
import type { DashboardSummary } from '@/domain/entities/DashboardSummary';

function percentChange(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? 0 : undefined; // sin base para comparar
  return ((current - previous) / previous) * 100;
}

export class GetDashboardSummary {
  constructor(private readonly dashboardRepository: IDashboardRepository) {}

  async execute(userId: string): Promise<DashboardSummary> {
    const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    const [netWorth, monthlyHistory, categoryBreakdown] = await Promise.all([
      this.dashboardRepository.getNetWorth(userId),
      this.dashboardRepository.getMonthlyHistory(userId, 6),
      this.dashboardRepository.getCategoryBreakdown(userId, currentMonthStart),
    ]);

    const current = monthlyHistory.at(-1) ?? { income: 0, expense: 0 };
    const previous = monthlyHistory.at(-2) ?? { income: 0, expense: 0 };
    const currentBalance = current.income - current.expense;
    const previousBalance = previous.income - previous.expense;

    return {
      netWorth: netWorth ?? { available: 0, invested: 0, saved: 0, debt: 0, netWorth: 0 },
      currentMonth: { income: current.income, expense: current.expense, balance: currentBalance },
      trend: {
        income: percentChange(current.income, previous.income),
        expense: percentChange(current.expense, previous.expense),
        balance: percentChange(currentBalance, previousBalance),
      },
      monthlyHistory,
      categoryBreakdown,
    };
  }
}
