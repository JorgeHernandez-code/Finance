'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { addDebtPaymentAction } from '@/app/(dashboard)/debts/actions';
import type { Debt } from '@/domain/entities/Debt';
import { formatMoney } from '@/shared/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

const formSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  paymentDate: z.string().min(1, 'Selecciona una fecha'),
});
type FormValues = z.infer<typeof formSchema>;

interface AddPaymentDialogProps {
  debt: Debt | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddPaymentDialog({ debt, onOpenChange, onSaved }: AddPaymentDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, paymentDate: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (debt) form.reset({ amount: 0, paymentDate: new Date().toISOString().slice(0, 10) });
  }, [debt, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!debt) return;
    const result = await addDebtPaymentAction({ debtId: debt.id, ...values });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Abono registrado.');
    onSaved();
  });

  return (
    <Dialog open={!!debt} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            {debt && (
              <>
                Saldo pendiente de &ldquo;{debt.creditorName}&rdquo;:{' '}
                <span className="font-medium text-foreground">{formatMoney(debt.remainingBalance)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Monto</Label>
            <Input id="payment-amount" type="number" step="0.01" min="0.01" {...form.register('amount')} />
            {form.formState.errors.amount && <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-date">Fecha</Label>
            <Input id="payment-date" type="date" {...form.register('paymentDate')} />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Registrar abono'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
