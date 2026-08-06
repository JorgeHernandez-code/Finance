'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseDashboardRepository } from '@/infrastructure/supabase/repositories/SupabaseDashboardRepository';
import { GetDashboardSummary } from '@/application/use-cases/dashboard/GetDashboardSummary';
import type { DashboardSummary } from '@/domain/entities/DashboardSummary';

/**
 * El primer render usa `initialData` (calculado server-side en la page —
 * cero waterfall, cero spinner en la carga inicial). Refetch posteriores
 * (botón "Refrescar", focus de ventana si se habilita) corren en cliente
 * contra Supabase directamente — RLS protege igual que en el servidor.
 */
export function useDashboardSummary(userId: string, initialData: DashboardSummary) {
  return useQuery({
    queryKey: ['dashboard-summary', userId],
    queryFn: async () => {
      const supabase = createClient();
      const useCase = new GetDashboardSummary(new SupabaseDashboardRepository(supabase));
      return useCase.execute(userId);
    },
    initialData,
    staleTime: 60 * 1000,
  });
}
