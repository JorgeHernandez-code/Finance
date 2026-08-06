'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseBudgetRepository } from '@/infrastructure/supabase/repositories/SupabaseBudgetRepository';
import { ListBudgets } from '@/application/use-cases/budgets/ListBudgets';
import type { Budget } from '@/domain/entities/Budget';

export function useBudgets(userId: string, initialData: Budget[]) {
  return useQuery({
    queryKey: ['budgets', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new ListBudgets(new SupabaseBudgetRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
