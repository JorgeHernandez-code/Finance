import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseSavingsGoalRepository } from '@/infrastructure/supabase/repositories/SupabaseSavingsGoalRepository';
import { SupabaseFinancialSnapshotRepository } from '@/infrastructure/supabase/repositories/SupabaseFinancialSnapshotRepository';
import { ListSavingsGoals } from '@/application/use-cases/savings/ListSavingsGoals';
import { monthlyCapacity } from '@/domain/finance/cashflow';
import { SavingsGoalsView } from '@/presentation/components/modules/savings/SavingsGoalsView';

export const metadata = { title: 'Ahorros' };

export default async function SavingsPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [goals, snapshot] = await Promise.all([
    new ListSavingsGoals(new SupabaseSavingsGoalRepository(supabase)).execute(user.id),
    new SupabaseFinancialSnapshotRepository(supabase).load(user.id),
  ]);
  const currencies = [...new Set([snapshot.defaultCurrency, ...goals.map((g) => g.currency)])];
  const capacity = Object.fromEntries(currencies.map((c) => [c, monthlyCapacity(snapshot, c)]));

  return (
    <SavingsGoalsView
      userId={user.id}
      initialData={goals}
      contributions={snapshot.contributions}
      accounts={snapshot.accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
      defaultCurrency={snapshot.defaultCurrency}
      capacity={capacity}
      openNew={nuevo === 'meta'}
    />
  );
}
