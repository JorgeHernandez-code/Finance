import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseClientRepository } from '@/infrastructure/supabase/repositories/SupabaseClientRepository';
import { ListClients } from '@/application/use-cases/clients/ListClients';
import { ClientsView } from '@/presentation/components/modules/clients/ClientsView';

export const metadata = { title: 'Clientes' };

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const clients = await new ListClients(new SupabaseClientRepository(supabase)).execute(user.id);

  return <ClientsView userId={user.id} initialData={clients} />;
}
