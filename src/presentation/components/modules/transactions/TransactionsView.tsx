'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTransactions } from '@/presentation/hooks/useTransactions';
import { DEFAULT_TRANSACTION_FILTERS, type TransactionFiltersDto } from '@/application/dto/transaction';
import type { Transaction, TransactionListResult } from '@/domain/entities/Transaction';
import type { TransactionFormOptions } from '@/application/use-cases/transactions/GetTransactionFormOptions';
import { Button } from '@/presentation/components/ui/button';
import { TransactionFilters } from './TransactionFilters';
import { TransactionsTable } from './TransactionsTable';
import { TransactionFormSheet } from './TransactionFormSheet';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import { TransferDialog } from './TransferDialog';

interface TransactionsViewProps {
  userId: string;
  initialData: TransactionListResult;
  options: TransactionFormOptions;
  /** Acceso rápido desde el dashboard (?nuevo=…). */
  initialAction?: 'income' | 'expense' | 'transfer';
}

export function TransactionsView({ userId, initialData, options, initialAction }: TransactionsViewProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TransactionFiltersDto>(DEFAULT_TRANSACTION_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [transferOpen, setTransferOpen] = useState(initialAction === 'transfer');
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>(
    initialAction === 'income' ? 'income' : 'expense'
  );

  useEffect(() => {
    if (initialAction === 'income' || initialAction === 'expense') {
      setDefaultType(initialAction);
      setEditing(null);
      setSheetOpen(true);
    }
  }, [initialAction]);

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
    setDefaultType('expense');
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
          <p className="text-sm text-muted-foreground">
            Todos tus ingresos, gastos y movimientos entre cuentas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setTransferOpen(true)}
            disabled={options.accounts.length < 2}
          >
            <ArrowLeftRight className="size-4" /> Entre cuentas
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nueva transacción
          </Button>
        </div>
      </div>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={options.accounts}
        onSaved={invalidate}
      />

      <TransactionFilters
        filters={filters}
        onChange={patchFilters}
        onReset={() => setFilters(DEFAULT_TRANSACTION_FILTERS)}
        accounts={options.accounts}
        categories={options.categories}
      />

      <TransactionsTable
        transactions={data.items}
        isLoading={isFetching}
        onEdit={openEdit}
        onDelete={setDeleting}
      />

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
        defaultType={defaultType}
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
