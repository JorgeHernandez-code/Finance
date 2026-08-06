import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseInvestmentRepository } from '@/infrastructure/supabase/repositories/SupabaseInvestmentRepository';
import { ListInvestments } from '@/application/use-cases/investments/ListInvestments';
import { InvestmentsView } from '@/presentation/components/modules/investments/InvestmentsView';

export const metadata = { title: 'Inversiones' };

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const investments = await new ListInvestments(new SupabaseInvestmentRepository(supabase)).execute(user.id);

  return <InvestmentsView userId={user.id} initialData={investments} />;
}
