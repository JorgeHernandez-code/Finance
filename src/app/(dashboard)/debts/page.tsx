import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseFinancialSnapshotRepository } from '@/infrastructure/supabase/repositories/SupabaseFinancialSnapshotRepository';
import { DebtsView } from '@/presentation/components/modules/debts/DebtsView';
import { addDaysIso } from '@/shared/lib/dates';

export const metadata = { title: 'Deudas' };

export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [snapshot, categories] = await Promise.all([
    new SupabaseFinancialSnapshotRepository(supabase).load(user.id),
    supabase.from('categories').select('id, name').eq('user_id', user.id).eq('type', 'expense').order('name'),
  ]);
  const since = addDaysIso(snapshot.today, -90);

  return (
    <DebtsView
      userId={user.id}
      initialData={snapshot.debts}
      rates={snapshot.rates}
      accounts={snapshot.accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency }))}
      expenseCategories={categories.data ?? []}
      defaultCurrency={snapshot.defaultCurrency}
      initialAction={nuevo === 'deuda' || nuevo === 'pago' ? nuevo : undefined}
      inventoryConfirmed={snapshot.checkins.some(
        (c) => c.actionKey === 'debts_inventory' && c.completedAt.slice(0, 10) >= since
      )}
    />
  );
}
