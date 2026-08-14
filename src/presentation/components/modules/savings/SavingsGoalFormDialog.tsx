'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { savingsGoalInputSchema, type SavingsGoalInputDto } from '@/application/dto/savingsGoal';
import { createSavingsGoalAction, updateSavingsGoalAction } from '@/app/(dashboard)/savings/actions';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
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
import { ColorPicker } from '@/presentation/components/modules/shared/ColorPicker';
import { IconPicker } from '@/presentation/components/modules/shared/IconPicker';

interface SavingsGoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SavingsGoal | null;
  onSaved: () => void;
}

function toFormValues(editing: SavingsGoal | null): SavingsGoalInputDto {
  if (!editing) {
    return {
      name: '',
      targetAmount: 0,
      targetDate: null,
      icon: 'target',
      color: '#22c55e',
      status: 'active',
    };
  }
  return {
    name: editing.name,
    targetAmount: editing.targetAmount,
    targetDate: editing.targetDate,
    icon: editing.icon,
    color: editing.color,
    status: editing.status,
  };
}

export function SavingsGoalFormDialog({ open, onOpenChange, editing, onSaved }: SavingsGoalFormDialogProps) {
  const form = useForm<SavingsGoalInputDto>({
    resolver: zodResolver(savingsGoalInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing
      ? await updateSavingsGoalAction({ ...values, id: editing.id })
      : await createSavingsGoalAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Meta actualizada.' : 'Meta creada.');
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}</DialogTitle>
          <DialogDescription>Ponte un objetivo y ve registrando tus aportes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Vacaciones" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetAmount">Monto objetivo</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('targetAmount')}
              />
              {form.formState.errors.targetAmount && (
                <p className="text-xs text-danger">{form.formState.errors.targetAmount.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetDate">Fecha objetivo (opcional)</Label>
              <Input id="targetDate" type="date" {...form.register('targetDate')} />
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
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="archived">Archivada</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Ícono</Label>
              <Controller
                control={form.control}
                name="icon"
                render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <Controller
                control={form.control}
                name="color"
                render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
