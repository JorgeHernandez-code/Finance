'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { addInvestmentValuationAction } from '@/app/(dashboard)/investments/actions';
import type { Investment } from '@/domain/entities/Investment';
import { formatMoney } from '@/shared/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

const formSchema = z.object({
  value: z.coerce.number().min(0, 'El valor no puede ser negativo'),
  valuationDate: z.string().min(1, 'Selecciona una fecha'),
});
type FormValues = z.infer<typeof formSchema>;

interface AddValuationDialogProps {
  investment: Investment | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddValuationDialog({ investment, onOpenChange, onSaved }: AddValuationDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { value: 0, valuationDate: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (investment) {
      form.reset({ value: investment.currentValue, valuationDate: new Date().toISOString().slice(0, 10) });
    }
  }, [investment, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!investment) return;
    const result = await addInvestmentValuationAction({ investmentId: investment.id, ...values });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Valuación registrada.');
    onSaved();
  });

  return (
    <Dialog open={!!investment} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Actualizar valor</DialogTitle>
          <DialogDescription>
            {investment && (
              <>
                Invertido en &ldquo;{investment.name}&rdquo;:{' '}
                <span className="font-medium text-foreground">{formatMoney(investment.amountInvested)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="valuation-value">Valor actual</Label>
            <Input id="valuation-value" type="number" step="0.01" min="0" {...form.register('value')} />
            {form.formState.errors.value && <p className="text-xs text-danger">{form.formState.errors.value.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="valuation-date">Fecha</Label>
            <Input id="valuation-date" type="date" {...form.register('valuationDate')} />
          </div>
          <p className="text-xs text-muted-foreground">
            Si ya registraste una valuación en esta fecha, se actualizará con el nuevo valor.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Actualizar valor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
