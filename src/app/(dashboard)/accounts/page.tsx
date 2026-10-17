import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseAccountRepository } from '@/infrastructure/supabase/repositories/SupabaseAccountRepository';
import { ListAccounts } from '@/application/use-cases/accounts/ListAccounts';
import { AccountsView } from '@/presentation/components/modules/accounts/AccountsView';
import { num } from '@/infrastructure/supabase/mappers';

export const metadata = { title: 'Cuentas' };

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [accounts, recs] = await Promise.all([
    new ListAccounts(new SupabaseAccountRepository(supabase)).execute(user.id),
    supabase
      .from('account_reconciliations')
      .select('account_id, reconciled_on, statement_balance, computed_balance')
      .eq('user_id', user.id)
      .order('reconciled_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  const reconciliations: Record<string, { date: string; difference: number }> = {};
  for (const r of recs.data ?? []) {
    reconciliations[r.account_id] ??= {
      date: r.reconciled_on,
      difference: Math.round((num(r.statement_balance) - num(r.computed_balance)) * 100) / 100,
    };
  }

  return <AccountsView userId={user.id} initialData={accounts} reconciliations={reconciliations} />;
}
