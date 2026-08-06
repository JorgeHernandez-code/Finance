'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseInvestmentRepository } from '@/infrastructure/supabase/repositories/SupabaseInvestmentRepository';
import { ListInvestments } from '@/application/use-cases/investments/ListInvestments';
import type { Investment } from '@/domain/entities/Investment';

export function useInvestments(userId: string, initialData: Investment[]) {
  return useQuery({
    queryKey: ['investments', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new ListInvestments(new SupabaseInvestmentRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
