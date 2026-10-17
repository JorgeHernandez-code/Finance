'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reconcileAccountAction } from '@/app/(dashboard)/accounts/reconcile-actions';
import type { Account } from '@/domain/entities/Account';
import { formatMoney } from '@/shared/lib/format';
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
  account: Account | null;
  onOpenChange: (open: boolean) => void;
}

export function ReconcileDialog({ account, onOpenChange }: Props) {
  const router = useRouter();
  const [statement, setStatement] = useState('');
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!account) return;
    setStatement('');
    setDate(todayIso());
    setNotes('');
  }, [account]);

  const diff =
    account && statement !== '' ? Math.round((Number(statement) - account.currentBalance) * 100) / 100 : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!account) return;
    setSubmitting(true);
    const result = await reconcileAccountAction({
      accountId: account.id,
      statementBalance: Number(statement),
      reconciledOn: date,
      notes: notes || null,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.difference === 0
        ? 'Cuenta conciliada: el saldo coincide.'
        : `Conciliación registrada. Diferencia de ${formatMoney(result.difference ?? 0, account.currency)}: revisa qué movimiento falta.`
    );
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Conciliar {account?.name}</DialogTitle>
          <DialogDescription>
            Escribe el saldo que ves hoy en tu banco o billetera. Finance calcula{' '}
            {account ? formatMoney(account.currentBalance, account.currency) : ''}. No se ajusta nada
            automáticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={`Saldo real (${account?.currency ?? ''})`} htmlFor="statement">
            <Input
              id="statement"
              type="number"
              inputMode="decimal"
              step="0.01"
              required
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </Field>
          {diff !== null && (
            <p className={diff === 0 ? 'text-sm text-success' : 'text-sm text-warning'}>
              {diff === 0
                ? 'Coincide con el saldo calculado.'
                : `Diferencia: ${formatMoney(diff, account?.currency)}. ${diff > 0 ? 'Puede faltar registrar un ingreso.' : 'Puede faltar registrar un gasto.'}`}
            </p>
          )}
          <Field label="Fecha" htmlFor="reconcile-date">
            <Input
              id="reconcile-date"
              type="date"
              max={todayIso()}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Nota (opcional)" htmlFor="reconcile-notes">
            <Input
              id="reconcile-notes"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || statement === ''}>
              {submitting ? 'Guardando...' : 'Registrar conciliación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
