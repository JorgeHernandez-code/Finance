'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseClientRepository } from '@/infrastructure/supabase/repositories/SupabaseClientRepository';
import { ListClients } from '@/application/use-cases/clients/ListClients';
import type { Client } from '@/domain/entities/Client';

export function useClients(userId: string, initialData: Client[]) {
  return useQuery({
    queryKey: ['clients', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new ListClients(new SupabaseClientRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
