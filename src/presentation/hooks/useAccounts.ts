'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseAccountRepository } from '@/infrastructure/supabase/repositories/SupabaseAccountRepository';
import { ListAccounts } from '@/application/use-cases/accounts/ListAccounts';
import type { Account } from '@/domain/entities/Account';

export function useAccounts(userId: string, initialData: Account[]) {
  return useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new ListAccounts(new SupabaseAccountRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
