'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { debtInputSchema, type DebtInputDto } from '@/application/dto/debt';
import { createDebtAction, updateDebtAction } from '@/app/(dashboard)/debts/actions';
import type { Debt } from '@/domain/entities/Debt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

interface DebtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Debt | null;
  onSaved: () => void;
}

function toFormValues(editing: Debt | null): DebtInputDto {
  if (!editing) {
    return {
      creditorName: '',
      direction: 'i_owe',
      principalAmount: 0,
      interestRate: null,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: null,
      status: 'active',
      notes: '',
    };
  }
  return {
    creditorName: editing.creditorName,
    direction: editing.direction,
    principalAmount: editing.principalAmount,
    interestRate: editing.interestRate,
    startDate: editing.startDate,
    dueDate: editing.dueDate,
    status: editing.status,
    notes: editing.notes ?? '',
  };
}

export function DebtFormDialog({ open, onOpenChange, editing, onSaved }: DebtFormDialogProps) {
  const form = useForm<DebtInputDto>({
    resolver: zodResolver(debtInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing
      ? await updateDebtAction({ ...values, id: editing.id })
      : await createDebtAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Deuda actualizada.' : 'Deuda creada.');
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar deuda' : 'Nueva deuda'}</DialogTitle>
          <DialogDescription>Dinero que debes o que te deben.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => form.setValue('direction', 'i_owe')}
              className={`rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors ${
                form.watch('direction') === 'i_owe'
                  ? 'border-danger bg-danger/10 text-danger'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Yo debo
            </button>
            <button
              type="button"
              onClick={() => form.setValue('direction', 'owed_to_me')}
              className={`rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors ${
                form.watch('direction') === 'owed_to_me'
                  ? 'border-success bg-success/10 text-success'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Me deben
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="creditorName">
              {form.watch('direction') === 'i_owe' ? 'Acreedor' : 'Deudor'}
            </Label>
            <Input
              id="creditorName"
              placeholder="Ej. Tarjeta de crédito"
              {...form.register('creditorName')}
            />
            {form.formState.errors.creditorName && (
              <p className="text-xs text-danger">{form.formState.errors.creditorName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="principalAmount">Monto</Label>
              <Input
                id="principalAmount"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('principalAmount')}
              />
              {form.formState.errors.principalAmount && (
                <p className="text-xs text-danger">{form.formState.errors.principalAmount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interestRate">Interés % (opcional)</Label>
              <Input id="interestRate" type="number" step="0.01" min="0" {...form.register('interestRate')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Fecha inicio</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Vencimiento (opcional)</Label>
              <Input id="dueDate" type="date" {...form.register('dueDate')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Estado</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="paid">Pagada</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" rows={3} {...form.register('notes')} />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear deuda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
