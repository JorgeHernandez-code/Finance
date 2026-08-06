import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseTransactionRepository } from '@/infrastructure/supabase/repositories/SupabaseTransactionRepository';
import { SupabaseReferenceDataRepository } from '@/infrastructure/supabase/repositories/SupabaseReferenceDataRepository';
import { ListTransactions } from '@/application/use-cases/transactions/ListTransactions';
import { GetTransactionFormOptions } from '@/application/use-cases/transactions/GetTransactionFormOptions';
import { DEFAULT_TRANSACTION_FILTERS } from '@/application/dto/transaction';
import { TransactionsView } from '@/presentation/components/modules/transactions/TransactionsView';

export const metadata = { title: 'Transacciones' };

/**
 * Server Component: primera carga sin spinner (igual que /dashboard) — trae
 * la primera página con filtros por defecto y las opciones del formulario
 * (cuentas/categorías/clientes) en paralelo, y se las pasa a TransactionsView.
 */
export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [initialData, options] = await Promise.all([
    new ListTransactions(new SupabaseTransactionRepository(supabase)).execute(user.id, DEFAULT_TRANSACTION_FILTERS),
    new GetTransactionFormOptions(new SupabaseReferenceDataRepository(supabase)).execute(user.id),
  ]);

  return <TransactionsView userId={user.id} initialData={initialData} options={options} />;
}
