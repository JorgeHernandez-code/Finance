'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { addDebtPaymentAction } from '@/app/(dashboard)/debts/actions';
import type { Debt } from '@/domain/entities/Debt';
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
import { Field, SelectField } from '../shared/FormField';

export interface PaymentAccountOption {
  id: string;
  name: string;
  currency: string;
}

export interface PaymentCategoryOption {
  id: string;
  name: string;
}

interface AddPaymentDialogProps {
  debt: Debt | null;
  accounts: PaymentAccountOption[];
  expenseCategories: PaymentCategoryOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddPaymentDialog({
  debt,
  accounts,
  expenseCategories,
  onOpenChange,
  onSaved,
}: AddPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [interest, setInterest] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(todayIso());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  // Una clave por apertura del diálogo: un doble clic o reintento no duplica el pago.
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!debt) return;
    setAmount(debt.installmentAmount ? String(debt.installmentAmount) : '');
    setInterest('');
    setFees('');
    setDate(todayIso());
    setAccountId(null);
    setCategoryId(expenseCategories.find((c) => /deuda/i.test(c.name))?.id ?? null);
    setNotes('');
    setIdempotencyKey(crypto.randomUUID());
  }, [debt, expenseCategories]);

  const sameCurrencyAccounts = accounts.filter((a) => a.currency === debt?.currency);
  const principalPart = Number(amount || 0) - Number(interest || 0) - Number(fees || 0);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!debt) return;
    setSubmitting(true);
    const result = await addDebtPaymentAction({
      debtId: debt.id,
      amount: Number(amount),
      paymentDate: date,
      interestAmount: interest === '' ? null : Number(interest),
      feesAmount: fees === '' ? null : Number(fees),
      notes: notes || null,
      accountId,
      categoryId,
      idempotencyKey,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(accountId ? 'Pago registrado y descontado de la cuenta.' : 'Pago registrado.');
    onSaved();
  }

  const isMine = debt?.direction === 'i_owe';

  return (
    <Dialog open={!!debt} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isMine ? 'Registrar pago' : 'Registrar cobro'}</DialogTitle>
          <DialogDescription>
            {debt && (
              <>
                Saldo pendiente {debt.balanceConfirmedAt ? '' : 'estimado '}de &ldquo;{debt.creditorName}
                &rdquo;:{' '}
                <span className="font-medium text-foreground">
                  {formatMaybeMoney(debt.remainingBalance, debt.currency, 'por confirmar', {
                    approximate: debt.amountIsEstimate,
                  })}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monto pagado" htmlFor="payment-amount">
              <Input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Fecha" htmlFor="payment-date">
              <Input
                id="payment-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="De eso, intereses" htmlFor="payment-interest" hint="Vacío si no lo sabes">
              <Input
                id="payment-interest"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
              />
            </Field>
            <Field label="Cargos / seguros" htmlFor="payment-fees">
              <Input
                id="payment-fees"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
              />
            </Field>
          </div>
          {(interest || fees) && amount && (
            <p className="text-xs text-muted-foreground">
              Abono a capital:{' '}
              <span className="font-medium text-foreground">
                {debt ? formatMoney(Math.max(0, principalPart), debt.currency) : ''}
              </span>
              . Solo esta parte reduce el saldo.
            </p>
          )}

          <SelectField
            label={isMine ? '¿De qué cuenta salió?' : '¿A qué cuenta entró?'}
            value={accountId}
            onChange={setAccountId}
            emptyLabel="No registrar movimiento de cuenta"
            options={sameCurrencyAccounts.map((a) => ({ value: a.id, label: a.name }))}
            hint={
              sameCurrencyAccounts.length === 0
                ? `No tienes cuentas en ${debt?.currency}.`
                : 'Si eliges una cuenta, el movimiento se crea automáticamente: no lo registres otra vez como gasto.'
            }
          />
          {accountId && isMine && (
            <SelectField
              label="Categoría del gasto"
              value={categoryId}
              onChange={setCategoryId}
              emptyLabel="Sin categoría"
              options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}

          <Field label="Nota (opcional)" htmlFor="payment-notes">
            <Input
              id="payment-notes"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !idempotencyKey}>
              {submitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
