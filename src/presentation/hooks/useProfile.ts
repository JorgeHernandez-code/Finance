'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseProfileRepository } from '@/infrastructure/supabase/repositories/SupabaseProfileRepository';
import { GetProfile } from '@/application/use-cases/profile/GetProfile';
import type { Profile } from '@/domain/entities/Profile';

export function useProfile(userId: string, initialData: Profile) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new GetProfile(new SupabaseProfileRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
