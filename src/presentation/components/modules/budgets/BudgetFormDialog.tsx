'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { budgetInputSchema, type BudgetInputDto } from '@/application/dto/budget';
import { createBudgetAction, updateBudgetAction } from '@/app/(dashboard)/budgets/actions';
import type { Budget } from '@/domain/entities/Budget';
import type { CategoryOption } from '@/domain/entities/ReferenceOption';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';

interface BudgetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  editing: Budget | null;
  onSaved: () => void;
}

function toFormValues(editing: Budget | null): BudgetInputDto {
  if (!editing) {
    return {
      categoryId: '',
      amount: 0,
      period: 'monthly',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: null,
      alertThresholdPercent: 80,
    };
  }
  return {
    categoryId: editing.categoryId,
    amount: editing.amount,
    period: editing.period,
    startDate: editing.startDate,
    endDate: editing.endDate,
    alertThresholdPercent: editing.alertThresholdPercent,
  };
}

export function BudgetFormDialog({
  open,
  onOpenChange,
  categories,
  editing,
  onSaved,
}: BudgetFormDialogProps) {
  const form = useForm<BudgetInputDto>({
    resolver: zodResolver(budgetInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing
      ? await updateBudgetAction({ ...values, id: editing.id })
      : await createBudgetAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Presupuesto actualizado.' : 'Presupuesto creado.');
    onSaved();
  });

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</DialogTitle>
          <DialogDescription>Ponle un límite de gasto a una categoría por periodo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Categoría</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría de gasto" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.categoryId && (
              <p className="text-xs text-danger">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Monto límite</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && (
                <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Periodo</Label>
              <Controller
                control={form.control}
                name="period"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Desde</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Hasta (opcional)</Label>
              <Input id="endDate" type="date" {...form.register('endDate')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alertThresholdPercent">Avisar al gastar el (%)</Label>
            <Input
              id="alertThresholdPercent"
              type="number"
              min="1"
              max="100"
              {...form.register('alertThresholdPercent')}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Guardando...'
                : editing
                  ? 'Guardar cambios'
                  : 'Crear presupuesto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
