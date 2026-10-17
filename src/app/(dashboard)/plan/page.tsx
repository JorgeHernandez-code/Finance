import { buildPlan } from '@/domain/finance/plan';
import { monthlyCommitments } from '@/domain/finance/cashflow';
import { isMonthCloseWindow } from '@/domain/finance/plan';
import { monthStart, weekStart } from '@/shared/lib/dates';
import { PlanView } from '@/presentation/components/modules/plan/PlanView';
import { loadFinance } from '../_lib/loadFinance';

export const metadata = { title: 'Mi plan' };

export default async function PlanPage() {
  const { snapshot } = await loadFinance();
  const done = (key: string, since: string) =>
    snapshot.checkins.some((c) => c.actionKey === key && c.completedAt.slice(0, 10) >= since);
  return (
    <PlanView
      plan={buildPlan(snapshot)}
      commitments={monthlyCommitments(snapshot)}
      defaultCurrency={snapshot.defaultCurrency}
      checkins={{
        weekly_review: done('weekly_review', weekStart(snapshot.today)),
        obligations_review: done('obligations_review', weekStart(snapshot.today)),
        monthly_close: done('monthly_close', monthStart(snapshot.today)),
        subscriptions_review: done('subscriptions_review', monthStart(snapshot.today)),
      }}
      monthCloseWindow={isMonthCloseWindow(snapshot.today)}
    />
  );
}
