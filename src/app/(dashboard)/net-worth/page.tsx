import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseFinancialSnapshotRepository } from '@/infrastructure/supabase/repositories/SupabaseFinancialSnapshotRepository';
import { computeNetWorth } from '@/domain/finance/netWorth';
import { NetWorthView } from '@/presentation/components/modules/net-worth/NetWorthView';

export const metadata = { title: 'Patrimonio' };

export default async function NetWorthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const snapshot = await new SupabaseFinancialSnapshotRepository(supabase).load(user.id);
  return <NetWorthView netWorth={computeNetWorth(snapshot)} today={snapshot.today} />;
}
