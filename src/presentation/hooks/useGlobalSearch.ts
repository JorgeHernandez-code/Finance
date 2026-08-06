'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseSearchRepository } from '@/infrastructure/supabase/repositories/SupabaseSearchRepository';
import { GlobalSearch } from '@/application/use-cases/search/GlobalSearch';

/** `enabled` corta la query antes de los 2 caracteres mínimos del schema — evita un round-trip que sabemos que va a fallar. */
export function useGlobalSearch(userId: string, query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['global-search', userId, trimmed],
    queryFn: async () => {
      const supabase = createClient();
      return new GlobalSearch(new SupabaseSearchRepository(supabase)).execute(userId, trimmed);
    },
    enabled: trimmed.length >= 2,
    staleTime: 10 * 1000,
  });
}
