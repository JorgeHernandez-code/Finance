'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/infrastructure/supabase/client';
import { SupabaseTransactionRepository } from '@/infrastructure/supabase/repositories/SupabaseTransactionRepository';
import { ListTransactions } from '@/application/use-cases/transactions/ListTransactions';
import type { TransactionFiltersDto } from '@/application/dto/transaction';
import type { TransactionListResult } from '@/domain/entities/Transaction';

/**
 * `initialData` es obligatorio (igual que useDashboardSummary) porque la page
 * siempre la calcula server-side para los filtros por defecto con los que
 * arranca TransactionsView — cero spinner en la carga inicial. `placeholderData`
 * mantiene la tabla anterior visible mientras llega la página/filtro nuevo,
 * en vez de parpadear a vacío.
 */
export function useTransactions(userId: string, filters: TransactionFiltersDto, initialData: TransactionListResult) {
  return useQuery({
    queryKey: ['transactions', userId, filters],
    queryFn: async () => {
      const supabase = createClient();
      const useCase = new ListTransactions(new SupabaseTransactionRepository(supabase));
      return useCase.execute(userId, filters);
    },
    initialData,
    placeholderData: (previous) => previous,
    staleTime: 15 * 1000,
  });
}
