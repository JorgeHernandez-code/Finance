'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { addSavingsContributionAction } from '@/app/(dashboard)/savings/actions';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
import { formatMoney } from '@/shared/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';

const formSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  contributionDate: z.string().min(1, 'Selecciona una fecha'),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface AddContributionDialogProps {
  goal: SavingsGoal | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddContributionDialog({ goal, onOpenChange, onSaved }: AddContributionDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0, contributionDate: new Date().toISOString().slice(0, 10), notes: '' },
  });

  useEffect(() => {
    if (goal) form.reset({ amount: 0, contributionDate: new Date().toISOString().slice(0, 10), notes: '' });
  }, [goal, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!goal) return;
    const result = await addSavingsContributionAction({
      goalId: goal.id,
      amount: values.amount,
      contributionDate: values.contributionDate,
      notes: values.notes || null,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Aporte registrado.');
    onSaved();
  });

  return (
    <Dialog open={!!goal} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar aporte</DialogTitle>
          <DialogDescription>
            {goal && (
              <>
                Progreso de &ldquo;{goal.name}&rdquo;:{' '}
                <span className="font-medium text-foreground">
                  {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contribution-amount">Monto</Label>
            <Input id="contribution-amount" type="number" step="0.01" min="0.01" {...form.register('amount')} />
            {form.formState.errors.amount && <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contribution-date">Fecha</Label>
            <Input id="contribution-date" type="date" {...form.register('contributionDate')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contribution-notes">Notas (opcional)</Label>
            <Textarea id="contribution-notes" rows={2} {...form.register('notes')} />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Registrar aporte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
