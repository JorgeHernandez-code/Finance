'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseSavingsGoalRepository } from '@/infrastructure/supabase/repositories/SupabaseSavingsGoalRepository';
import { ListSavingsGoals } from '@/application/use-cases/savings/ListSavingsGoals';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';

export function useSavingsGoals(userId: string, initialData: SavingsGoal[]) {
  return useQuery({
    queryKey: ['savings-goals', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new ListSavingsGoals(new SupabaseSavingsGoalRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
