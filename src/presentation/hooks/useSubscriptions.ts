'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseSubscriptionRepository } from '@/infrastructure/supabase/repositories/SupabaseSubscriptionRepository';
import { ListSubscriptions } from '@/application/use-cases/subscriptions/ListSubscriptions';
import type { Subscription } from '@/domain/entities/Subscription';

export function useSubscriptions(userId: string, initialData: Subscription[]) {
  return useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: async () => {
      const supabase = createClient();
      return new ListSubscriptions(new SupabaseSubscriptionRepository(supabase)).execute(userId);
    },
    initialData,
    staleTime: 30 * 1000,
  });
}
