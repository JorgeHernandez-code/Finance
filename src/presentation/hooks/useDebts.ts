'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseDebtRepository } from '@/infrastructure/supabase/repositories/SupabaseDebtRepository';
import { ListDebts } from '@/application/use-cases/debts/ListDebts';
import type { Debt } from '@/domain/entities/Debt';

export function useDebts(userId: string, initialData: Debt[]) {
  return useQuery({
    queryKey: ['debts', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new ListDebts(new SupabaseDebtRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
