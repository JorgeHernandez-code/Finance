import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseBudgetRepository } from '@/infrastructure/supabase/repositories/SupabaseBudgetRepository';
import { SupabaseReferenceDataRepository } from '@/infrastructure/supabase/repositories/SupabaseReferenceDataRepository';
import { ListBudgets } from '@/application/use-cases/budgets/ListBudgets';
import { BudgetsView } from '@/presentation/components/modules/budgets/BudgetsView';

export const metadata = { title: 'Presupuestos' };

export default async function BudgetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const referenceData = new SupabaseReferenceDataRepository(supabase);
  const [budgets, categories] = await Promise.all([
    new ListBudgets(new SupabaseBudgetRepository(supabase)).execute(user.id),
    referenceData.listCategories(user.id),
  ]);

  return <BudgetsView userId={user.id} initialData={budgets} categories={categories} />;
}
