'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { investmentInputSchema, type InvestmentInputDto } from '@/application/dto/investment';
import { createInvestmentAction, updateInvestmentAction } from '@/app/(dashboard)/investments/actions';
import type { Investment } from '@/domain/entities/Investment';
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

export const INVESTMENT_TYPE_LABELS: Record<Investment['type'], string> = {
  stocks: 'Acciones',
  crypto: 'Cripto',
  real_estate: 'Bienes raíces',
  business: 'Negocio propio',
  other: 'Otro',
};

interface InvestmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Investment | null;
  onSaved: () => void;
}

function toFormValues(editing: Investment | null): InvestmentInputDto {
  if (!editing) {
    return {
      name: '',
      type: 'stocks',
      amountInvested: 0,
      startDate: new Date().toISOString().slice(0, 10),
      notes: '',
    };
  }
  return {
    name: editing.name,
    type: editing.type,
    amountInvested: editing.amountInvested,
    startDate: editing.startDate,
    notes: editing.notes ?? '',
  };
}

export function InvestmentFormDialog({ open, onOpenChange, editing, onSaved }: InvestmentFormDialogProps) {
  const form = useForm<InvestmentInputDto>({
    resolver: zodResolver(investmentInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing
      ? await updateInvestmentAction({ ...values, id: editing.id })
      : await createInvestmentAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Inversión actualizada.' : 'Inversión creada.');
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar inversión' : 'Nueva inversión'}</DialogTitle>
          <DialogDescription>Registra lo invertido y actualiza su valor con el tiempo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Acciones Apple" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountInvested">Monto invertido</Label>
              <Input
                id="amountInvested"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register('amountInvested')}
              />
              {form.formState.errors.amountInvested && (
                <p className="text-xs text-danger">{form.formState.errors.amountInvested.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Fecha inicio</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
            </div>
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
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear inversión'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
