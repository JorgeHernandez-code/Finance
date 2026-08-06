import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseReportRepository } from '@/infrastructure/supabase/repositories/SupabaseReportRepository';
import { GetYearlyReport } from '@/application/use-cases/reports/GetYearlyReport';
import { ReportsView } from '@/presentation/components/modules/reports/ReportsView';

export const metadata = { title: 'Reportes' };

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const year = new Date().getFullYear();
  const report = await new GetYearlyReport(new SupabaseReportRepository(supabase)).execute(user.id, year);

  return <ReportsView userId={user.id} initialYear={year} initialData={report} />;
}
