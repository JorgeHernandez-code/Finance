import { DashboardView } from '@/presentation/components/modules/dashboard/DashboardView';
import { buildFinanceOverview } from '@/application/use-cases/finance/GetFinanceOverview';
import { loadFinance } from '../_lib/loadFinance';

export const metadata = { title: 'Dashboard' };

/**
 * Server Component: calcula todo con los datos reales del usuario (RLS) y
 * con funciones puras de src/domain/finance. Las acciones del usuario
 * revalidan esta ruta, así que no necesita refetch en cliente.
 */
export default async function DashboardPage() {
  const { snapshot, weekly } = await loadFinance();
  return <DashboardView data={buildFinanceOverview(snapshot, weekly)} />;
}
