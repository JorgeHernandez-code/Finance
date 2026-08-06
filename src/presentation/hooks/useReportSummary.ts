'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseReportRepository } from '@/infrastructure/supabase/repositories/SupabaseReportRepository';
import { GetYearlyReport } from '@/application/use-cases/reports/GetYearlyReport';
import type { ReportSummary } from '@/domain/entities/Report';

/**
 * `initialData` cubre el año por defecto (calculado server-side en page.tsx);
 * `placeholderData` mantiene el reporte anterior visible mientras carga el
 * año recién seleccionado, en vez de parpadear a vacío (mismo patrón que
 * useTransactions).
 */
export function useReportSummary(userId: string, year: number, initialYear: number, initialData: ReportSummary) {
  return useQuery({
    queryKey: ['report', userId, year],
    queryFn: async () => {
      const supabase = createClient();
      return new GetYearlyReport(new SupabaseReportRepository(supabase)).execute(userId, year);
    },
    initialData: year === initialYear ? initialData : undefined,
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });
}
