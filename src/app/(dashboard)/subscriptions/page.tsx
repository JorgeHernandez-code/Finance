import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseSubscriptionRepository } from '@/infrastructure/supabase/repositories/SupabaseSubscriptionRepository';
import { SupabaseReferenceDataRepository } from '@/infrastructure/supabase/repositories/SupabaseReferenceDataRepository';
import { ListSubscriptions } from '@/application/use-cases/subscriptions/ListSubscriptions';
import { GetTransactionFormOptions } from '@/application/use-cases/transactions/GetTransactionFormOptions';
import { SubscriptionsView } from '@/presentation/components/modules/subscriptions/SubscriptionsView';

export const metadata = { title: 'Suscripciones' };

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [subscriptions, options] = await Promise.all([
    new ListSubscriptions(new SupabaseSubscriptionRepository(supabase)).execute(user.id),
    new GetTransactionFormOptions(new SupabaseReferenceDataRepository(supabase)).execute(user.id),
  ]);

  return <SubscriptionsView userId={user.id} initialData={subscriptions} options={options} />;
}
