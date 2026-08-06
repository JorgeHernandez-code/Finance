import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseDebtRepository } from '@/infrastructure/supabase/repositories/SupabaseDebtRepository';
import { ListDebts } from '@/application/use-cases/debts/ListDebts';
import { DebtsView } from '@/presentation/components/modules/debts/DebtsView';

export const metadata = { title: 'Deudas' };

export default async function DebtsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const debts = await new ListDebts(new SupabaseDebtRepository(supabase)).execute(user.id);

  return <DebtsView userId={user.id} initialData={debts} />;
}
