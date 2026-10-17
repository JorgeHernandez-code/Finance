'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { createTransferAction } from '@/app/(dashboard)/transactions/actions';
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

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; name: string; currency: string }[];
  onSaved?: () => void;
}

/**
 * Mueve dinero ENTRE CUENTAS PROPIAS dentro de Finance (registro). No hace
 * ninguna operación bancaria: solo deja constancia de un movimiento que el
 * usuario ya hizo. No cuenta como ingreso ni gasto.
 */
export function TransferDialog({ open, onOpenChange, accounts, onSaved }: TransferDialogProps) {
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [amountOut, setAmountOut] = useState('');
  const [amountIn, setAmountIn] = useState('');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('Transferencia entre cuentas');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFrom(null);
    setTo(null);
    setAmountOut('');
    setAmountIn('');
    setDate(todayIso());
    setDescription('Transferencia entre cuentas');
    setIdempotencyKey(crypto.randomUUID());
  }, [open]);

  const fromAccount = accounts.find((a) => a.id === from);
  const toAccount = accounts.find((a) => a.id === to);
  const crossCurrency = !!fromAccount && !!toAccount && fromAccount.currency !== toAccount.currency;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!from || !to) {
      toast.error('Elige la cuenta de origen y la de destino.');
      return;
    }
    setSubmitting(true);
    const result = await createTransferAction({
      fromAccountId: from,
      toAccountId: to,
      amountOut: Number(amountOut),
      amountIn: crossCurrency ? Number(amountIn) : Number(amountOut),
      description,
      transactionDate: date,
      idempotencyKey,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Transferencia registrada.');
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Movimiento entre cuentas</DialogTitle>
          <DialogDescription>
            Registra un movimiento que ya hiciste entre tus cuentas. No es ingreso ni gasto y Finance no mueve
            dinero real.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <SelectField
              label="Desde"
              value={from}
              onChange={setFrom}
              emptyLabel="Elegir…"
              options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
            />
            <ArrowRight className="mx-auto mb-2.5 hidden size-4 text-muted-foreground sm:block" aria-hidden />
            <SelectField
              label="Hacia"
              value={to}
              onChange={setTo}
              emptyLabel="Elegir…"
              options={accounts
                .filter((a) => a.id !== from)
                .map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={crossCurrency ? `Sale (${fromAccount?.currency})` : 'Monto'} htmlFor="transfer-out">
              <Input
                id="transfer-out"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={amountOut}
                onChange={(e) => setAmountOut(e.target.value)}
              />
            </Field>
            {crossCurrency && (
              <Field
                label={`Llega (${toAccount?.currency})`}
                htmlFor="transfer-in"
                hint="Lo que realmente recibiste"
              >
                <Input
                  id="transfer-in"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Descripción" htmlFor="transfer-desc">
              <Input
                id="transfer-desc"
                required
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="Fecha" htmlFor="transfer-date">
              <Input
                id="transfer-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
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
