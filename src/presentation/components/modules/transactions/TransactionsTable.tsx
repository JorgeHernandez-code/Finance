'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { Transaction } from '@/domain/entities/Transaction';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/presentation/components/ui/table';
import { Badge } from '@/presentation/components/ui/badge';
import { Button } from '@/presentation/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionsTable({ transactions, isLoading, onEdit, onDelete }: TransactionsTableProps) {
  if (!isLoading && transactions.length === 0) {
    return (
      <div className="glass rounded-lg p-10 text-center">
        <p className="text-sm font-medium text-foreground">No hay transacciones con estos filtros.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ajusta los filtros o registra un nuevo movimiento.</p>
      </div>
    );
  }

  return (
    <div className={cn('glass rounded-lg', isLoading && 'opacity-60')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="text-muted-foreground">
                {format(parseISO(transaction.transactionDate), 'd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell className="max-w-[220px] truncate font-medium text-foreground">
                {transaction.description}
              </TableCell>
              <TableCell>
                {transaction.categoryName ? (
                  <Badge variant="outline" className="gap-1.5">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: transaction.categoryColor ?? undefined }}
                    />
                    {transaction.categoryName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{transaction.accountName}</TableCell>
              <TableCell className="text-muted-foreground">{transaction.clientName ?? '—'}</TableCell>
              <TableCell className="tabular text-right font-medium">
                <span className={cn('inline-flex items-center gap-1', transaction.type === 'income' ? 'text-success' : 'text-danger')}>
                  {transaction.type === 'income' ? (
                    <ArrowUpCircle className="size-3.5" />
                  ) : (
                    <ArrowDownCircle className="size-3.5" />
                  )}
                  {formatMoney(transaction.amount, transaction.currency)}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil className="size-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onClick={() => onDelete(transaction)}>
                      <Trash2 className="size-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
