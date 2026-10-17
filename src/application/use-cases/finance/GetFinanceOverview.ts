import { addMonthsIso, monthStart, weekStart } from '@/shared/lib/dates';
import { computeAvailability, type Availability } from '@/domain/finance/availability';
import { summarizeDebts, type DebtSummary } from '@/domain/finance/debts';
import { computeNetWorth, type NetWorth } from '@/domain/finance/netWorth';
import {
  summarizeMonth,
  monthlyCommitments,
  type MonthSummary,
  type Commitments,
} from '@/domain/finance/cashflow';
import { goalMetrics, type GoalMetrics } from '@/domain/finance/savings';
import { nextActions, upcomingReminders, type NextAction, type Reminder } from '@/domain/finance/actions';
import {
  computeStreak,
  levelFor,
  totalXp,
  weeklyChallenges,
  type Challenge,
  type LevelInfo,
  type Streak,
} from '@/domain/finance/progress';
import type { HealthScore } from '@/domain/finance/healthScore';
import type { FinancialSnapshot, SnapshotGoal } from '@/domain/finance/snapshot';
import { LESSONS, nextLesson } from '@/domain/academy/lessons';
import type { CategoryBreakdownItem, MonthlyPoint } from '@/domain/entities/DashboardSummary';

export interface ActivityItem {
  key: string;
  date: string;
  createdAt: string;
  kind: 'income' | 'expense' | 'transfer' | 'debt_payment' | 'contribution' | 'withdrawal';
  title: string;
  amount: number;
  currency: string;
}

export interface FinanceOverview {
  today: string;
  defaultCurrency: string;
  availability: Availability;
  month: MonthSummary;
  commitments: Commitments;
  debts: Omit<DebtSummary, 'debts'>;
  netWorth: NetWorth;
  goals: { goal: SnapshotGoal; metrics: GoalMetrics }[];
  activity: ActivityItem[];
  actions: NextAction[];
  reminders: Reminder[];
  health: HealthScore;
  streak: Streak;
  level: LevelInfo;
  challenges: Challenge[];
  monthlyHistory: MonthlyPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  weeklyReviewDone: boolean;
  hasAnyData: boolean;
}

/** Arma el dashboard con datos reales. Puro sobre el snapshot (se puede probar sin red). */
export function buildFinanceOverview(snapshot: FinancialSnapshot, health: HealthScore): FinanceOverview {
  const { today, defaultCurrency } = snapshot;
  const fullDebtSummary = summarizeDebts(snapshot);
  const debts: Omit<DebtSummary, 'debts'> = {
    iOwe: fullDebtSummary.iOwe,
    owedToMe: fullDebtSummary.owedToMe,
    upcoming: fullDebtSummary.upcoming,
    overdue: fullDebtSummary.overdue,
    noDate: fullDebtSummary.noDate,
    negotiating: fullDebtSummary.negotiating,
    incomplete: fullDebtSummary.incomplete,
    monthlyInstallments: fullDebtSummary.monthlyInstallments,
  };
  const completed = new Set(snapshot.lessons.filter((l) => l.completedAt).map((l) => l.lessonId));

  const monthlyHistory: MonthlyPoint[] = [5, 4, 3, 2, 1, 0].map((back) => {
    const m = summarizeMonth(snapshot, addMonthsIso(monthStart(today), -back));
    return {
      month: m.monthStart,
      income: m.income[defaultCurrency] ?? 0,
      expense: m.expense[defaultCurrency] ?? 0,
    };
  });

  const byCategory = new Map<string, CategoryBreakdownItem>();
  for (const t of snapshot.transactions) {
    if (t.type !== 'expense' || t.currency !== defaultCurrency || t.date < monthStart(today) || !t.categoryId)
      continue;
    const item = byCategory.get(t.categoryId) ?? {
      categoryId: t.categoryId,
      name: t.categoryName ?? '—',
      color: t.categoryColor ?? '#64748b',
      total: 0,
    };
    item.total = Math.round((item.total + t.amount) * 100) / 100;
    byCategory.set(t.categoryId, item);
  }

  const debtName = new Map(snapshot.debts.map((d) => [d.id, d]));
  const goalName = new Map(snapshot.goals.map((g) => [g.id, g]));
  const activity: ActivityItem[] = [
    ...snapshot.transactions.slice(0, 40).map((t) => ({
      key: `t-${t.id}`,
      date: t.date,
      createdAt: t.createdAt,
      kind: t.type === 'transfer' ? ('transfer' as const) : t.type,
      title: t.description,
      amount: t.type === 'transfer' && t.transferDirection === 'out' ? -t.amount : t.amount,
      currency: t.currency,
    })),
    ...snapshot.debtPayments
      .filter((p) => !p.transactionId)
      .map((p) => ({
        key: `p-${p.id}`,
        date: p.paymentDate,
        createdAt: p.createdAt,
        kind: 'debt_payment' as const,
        title: `Abono a ${debtName.get(p.debtId)?.creditorName ?? 'deuda'}`,
        amount: p.amount,
        currency: debtName.get(p.debtId)?.currency ?? defaultCurrency,
      })),
    ...snapshot.contributions.map((c, i) => ({
      key: `c-${c.goalId}-${i}`,
      date: c.date,
      createdAt: c.createdAt,
      kind: c.kind === 'withdrawal' ? ('withdrawal' as const) : ('contribution' as const),
      title: `${c.kind === 'withdrawal' ? 'Retiro de' : 'Aporte a'} ${goalName.get(c.goalId)?.name ?? 'meta'}`,
      amount: c.amount,
      currency: goalName.get(c.goalId)?.currency ?? defaultCurrency,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    today,
    defaultCurrency,
    availability: computeAvailability(snapshot),
    month: summarizeMonth(snapshot, today),
    commitments: monthlyCommitments(snapshot),
    debts,
    netWorth: computeNetWorth(snapshot),
    goals: snapshot.goals
      .filter((g) => g.status === 'active' || g.status === 'paused')
      .sort((a, b) => a.priority - b.priority)
      .map((goal) => ({ goal, metrics: goalMetrics(goal, snapshot) })),
    activity,
    actions: nextActions(snapshot),
    reminders: upcomingReminders(snapshot, 14, nextLesson(completed)?.title ?? null),
    health,
    streak: computeStreak(snapshot),
    level: levelFor(totalXp(snapshot)),
    challenges: weeklyChallenges(snapshot),
    monthlyHistory,
    categoryBreakdown: [...byCategory.values()].sort((a, b) => b.total - a.total),
    weeklyReviewDone: snapshot.checkins.some(
      (c) => c.actionKey === 'weekly_review' && c.completedAt.slice(0, 10) >= weekStart(today)
    ),
    hasAnyData:
      snapshot.accounts.length +
        snapshot.transactions.length +
        snapshot.debts.length +
        snapshot.goals.length >
      0,
  };
}

export const TOTAL_LESSONS = LESSONS.length;
