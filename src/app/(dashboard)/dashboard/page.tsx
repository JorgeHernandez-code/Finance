import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseDashboardRepository } from '@/infrastructure/supabase/repositories/SupabaseDashboardRepository';
import { GetDashboardSummary } from '@/application/use-cases/dashboard/GetDashboardSummary';
import { DashboardView } from '@/presentation/components/modules/dashboard/DashboardView';

export const metadata = { title: 'Dashboard' };

/**
 * Server Component: trae el resumen inicial en el propio render del servidor
 * (sin spinner en la primera carga) y se lo pasa a DashboardView, que sigue
 * refrescando desde el cliente vía React Query (ver useDashboardSummary).
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El middleware ya garantiza sesión válida aquí; esto es solo un cinturón
  // de seguridad adicional por si el layout cambia en el futuro.
  if (!user) redirect('/login');

  const getSummary = new GetDashboardSummary(new SupabaseDashboardRepository(supabase));
  const summary = await getSummary.execute(user.id);

  return <DashboardView userId={user.id} initialData={summary} />;
}
