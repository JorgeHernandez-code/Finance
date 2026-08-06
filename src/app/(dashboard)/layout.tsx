import { createClient } from '@/infrastructure/supabase/server';
import { DashboardShell } from '@/presentation/components/modules/shell/DashboardShell';

/**
 * Layout de todas las rutas protegidas. La protección real (redirect si no
 * hay sesión) ya la hace src/middleware.ts antes de llegar aquí — este layout
 * solo se preocupa de la UI, pero sí necesita el email del usuario para la Topbar.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <DashboardShell userEmail={user?.email} userId={user?.id}>
      {children}
    </DashboardShell>
  );
}
