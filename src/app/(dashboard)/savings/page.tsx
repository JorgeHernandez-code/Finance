import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseSavingsGoalRepository } from '@/infrastructure/supabase/repositories/SupabaseSavingsGoalRepository';
import { ListSavingsGoals } from '@/application/use-cases/savings/ListSavingsGoals';
import { SavingsGoalsView } from '@/presentation/components/modules/savings/SavingsGoalsView';

export const metadata = { title: 'Ahorros' };

export default async function SavingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const goals = await new ListSavingsGoals(new SupabaseSavingsGoalRepository(supabase)).execute(user.id);

  return <SavingsGoalsView userId={user.id} initialData={goals} />;
}
