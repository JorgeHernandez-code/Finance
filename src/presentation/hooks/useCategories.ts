'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseCategoryRepository } from '@/infrastructure/supabase/repositories/SupabaseCategoryRepository';
import { ListCategories } from '@/application/use-cases/categories/ListCategories';
import type { Category } from '@/domain/entities/Category';

export function useCategories(userId: string, initialData: Category[]) {
  return useQuery({
    queryKey: ['categories', userId],
    queryFn: async () => {
      const supabase = createClient();
      const useCase = new ListCategories(new SupabaseCategoryRepository(supabase));
      return useCase.execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
