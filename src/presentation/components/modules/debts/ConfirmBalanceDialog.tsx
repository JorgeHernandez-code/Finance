'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { confirmDebtBalanceAction, listDebtPaymentsAction } from '@/app/(dashboard)/debts/actions';
import type { Debt, DebtPayment } from '@/domain/entities/Debt';
import { formatMaybeMoney, formatMoney } from '@/shared/lib/format';
import { todayIso } from '@/shared/lib/dates';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Field } from '../shared/FormField';

interface Props {
  debt: Debt | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Confirmar el saldo con el acreedor + historial de pagos. */
export function ConfirmBalanceDialog({ debt, onOpenChange, onSaved }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [payments, setPayments] = useState<DebtPayment[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!debt) return;
    setAmount('');
    setDate(todayIso());
    setPayments(null);
    listDebtPaymentsAction(debt.id).then((r) => setPayments(r.payments ?? []));
  }, [debt]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!debt) return;
    setSubmitting(true);
    const result = await confirmDebtBalanceAction({ id: debt.id, amount: Number(amount), confirmedAt: date });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Saldo confirmado. Desde ahora el saldo parte de este valor.');
    onSaved();
  }

  return (
    <Dialog open={!!debt} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saldo e historial</DialogTitle>
          <DialogDescription>
            {debt && (
              <>
                Finance calcula{' '}
                {formatMaybeMoney(debt.remainingBalance, debt.currency, 'un saldo desconocido', {
                  approximate: debt.amountIsEstimate,
                })}{' '}
                {debt.balanceConfirmedAt
                  ? `(confirmado el ${debt.balanceConfirmedAt}, más pagos posteriores)`
                  : '(estimado)'}
                . Si el acreedor te dio otro valor, regístralo aquí.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Saldo confirmado" htmlFor="confirm-amount">
              <Input
                id="confirm-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Fecha de la confirmación" htmlFor="confirm-date">
              <Input
                id="confirm-date"
                type="date"
                required
                max={todayIso()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="submit" disabled={submitting || amount === ''}>
              {submitting ? 'Guardando...' : 'Confirmar saldo'}
            </Button>
          </div>
        </form>

        <div className="mt-2 border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-medium">Historial de pagos</h3>
          {payments === null ? (
            <p className="text-xs text-muted-foreground">Cargando…</p>
          ) : payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin pagos registrados.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">
                    {p.paymentDate}
                    {p.interestAmount || p.feesAmount
                      ? ` · intereses/cargos ${formatMoney((p.interestAmount ?? 0) + (p.feesAmount ?? 0), debt?.currency)}`
                      : ''}
                    {p.transactionId ? ' · con movimiento' : ''}
                  </span>
                  <span className="tabular font-medium">{formatMoney(p.amount, debt?.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
