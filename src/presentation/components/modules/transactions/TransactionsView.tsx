'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTransactions } from '@/presentation/hooks/useTransactions';
import { DEFAULT_TRANSACTION_FILTERS, type TransactionFiltersDto } from '@/application/dto/transaction';
import type { Transaction, TransactionListResult } from '@/domain/entities/Transaction';
import type { TransactionFormOptions } from '@/application/use-cases/transactions/GetTransactionFormOptions';
import { Button } from '@/presentation/components/ui/button';
import { TransactionFilters } from './TransactionFilters';
import { TransactionsTable } from './TransactionsTable';
import { TransactionFormSheet } from './TransactionFormSheet';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';

interface TransactionsViewProps {
  userId: string;
  initialData: TransactionListResult;
  options: TransactionFormOptions;
}

export function TransactionsView({ userId, initialData, options }: TransactionsViewProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TransactionFiltersDto>(DEFAULT_TRANSACTION_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const { data, isFetching } = useTransactions(userId, filters, initialData);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function patchFilters(patch: Partial<TransactionFiltersDto>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['transactions', userId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary', userId] });
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Transacciones</h1>
          <p className="text-sm text-muted-foreground">Todos tus ingresos y gastos en un solo lugar.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nueva transacción
        </Button>
      </div>

      <TransactionFilters
        filters={filters}
        onChange={patchFilters}
        onReset={() => setFilters(DEFAULT_TRANSACTION_FILTERS)}
        accounts={options.accounts}
        categories={options.categories}
      />

      <TransactionsTable transactions={data.items} isLoading={isFetching} onEdit={openEdit} onDelete={setDeleting} />

      {data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {data.total} transacción{data.total === 1 ? '' : 'es'} · página {filters.page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => patchFilters({ page: filters.page - 1 })}
            >
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() => patchFilters({ page: filters.page + 1 })}
            >
              Siguiente <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <TransactionFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        options={options}
        editing={editing}
        onSaved={() => {
          setSheetOpen(false);
          invalidate();
        }}
      />

      <DeleteTransactionDialog
        transaction={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
