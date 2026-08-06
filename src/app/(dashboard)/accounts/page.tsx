import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseAccountRepository } from '@/infrastructure/supabase/repositories/SupabaseAccountRepository';
import { ListAccounts } from '@/application/use-cases/accounts/ListAccounts';
import { AccountsView } from '@/presentation/components/modules/accounts/AccountsView';

export const metadata = { title: 'Cuentas' };

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const accounts = await new ListAccounts(new SupabaseAccountRepository(supabase)).execute(user.id);

  return <AccountsView userId={user.id} initialData={accounts} />;
}
