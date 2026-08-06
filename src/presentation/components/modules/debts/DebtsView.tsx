'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, MoreHorizontal, Pencil, Trash2, HandCoins } from 'lucide-react';
import { useDebts } from '@/presentation/hooks/useDebts';
import { formatMoney, formatPercent } from '@/shared/lib/format';
import type { Debt } from '@/domain/entities/Debt';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent } from '@/presentation/components/ui/card';
import { Progress } from '@/presentation/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { DebtFormDialog } from './DebtFormDialog';
import { AddPaymentDialog } from './AddPaymentDialog';
import { DeleteDebtDialog } from './DeleteDebtDialog';

const STATUS_BADGE: Record<Debt['status'], { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  active: { label: 'Activa', variant: 'warning' },
  paid: { label: 'Pagada', variant: 'success' },
  overdue: { label: 'Vencida', variant: 'danger' },
};

interface DebtsViewProps {
  userId: string;
  initialData: Debt[];
}

export function DebtsView({ userId, initialData }: DebtsViewProps) {
  const queryClient = useQueryClient();
  const { data: debts } = useDebts(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['debts', userId] });
  }

  const totalIOwe = debts.filter((d) => d.direction === 'i_owe' && d.status !== 'paid').reduce((sum, d) => sum + d.remainingBalance, 0);
  const totalOwedToMe = debts
    .filter((d) => d.direction === 'owed_to_me' && d.status !== 'paid')
    .reduce((sum, d) => sum + d.remainingBalance, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Deudas</h1>
          <p className="text-sm text-muted-foreground">
            Debes <span className="font-medium text-danger">{formatMoney(totalIOwe)}</span> · te deben{' '}
            <span className="font-medium text-success">{formatMoney(totalOwedToMe)}</span>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Nueva deuda
        </Button>
      </div>

      {debts.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes deudas registradas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Registra lo que debes o te deben para hacerles seguimiento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {debts.map((debt) => {
            const status = STATUS_BADGE[debt.status];
            const paidPercent = debt.principalAmount > 0 ? (debt.totalPaid / debt.principalAmount) * 100 : 0;

            return (
              <Card key={debt.id}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{debt.creditorName}</p>
                      <p className="text-xs text-muted-foreground">{debt.direction === 'i_owe' ? 'Yo debo' : 'Me deben'}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPayingDebt(debt)}>
                          <HandCoins className="size-4" /> Registrar abono
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(debt);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => setDeleting(debt)}>
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="tabular text-lg font-semibold text-foreground">{formatMoney(debt.remainingBalance)}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>Pagado: {formatMoney(debt.totalPaid)}</span>
                      <span>{formatPercent(paidPercent)}</span>
                    </div>
                    <Progress value={paidPercent} indicatorClassName="bg-success" />
                  </div>

                  {debt.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Vence: {format(parseISO(debt.dueDate), 'd MMM yyyy', { locale: es })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DebtFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <AddPaymentDialog
        debt={payingDebt}
        onOpenChange={(open) => !open && setPayingDebt(null)}
        onSaved={() => {
          setPayingDebt(null);
          invalidate();
        }}
      />

      <DeleteDebtDialog
        debt={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
