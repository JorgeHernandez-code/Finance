'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { accountInputSchema, type AccountInputDto } from '@/application/dto/account';
import { createAccountAction, updateAccountAction } from '@/app/(dashboard)/accounts/actions';
import type { Account } from '@/domain/entities/Account';
import { CURRENCIES } from '@/shared/config/currencies';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/ui/select';
import { ColorPicker } from '@/presentation/components/modules/shared/ColorPicker';
import { IconPicker } from '@/presentation/components/modules/shared/IconPicker';

const TYPE_LABELS: Record<AccountInputDto['type'], string> = {
  cash: 'Efectivo',
  bank: 'Cuenta bancaria',
  digital_wallet: 'Billetera digital',
  credit_card: 'Tarjeta de crédito',
  other: 'Otra',
};

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Account | null;
  onSaved: () => void;
}

function toFormValues(editing: Account | null): AccountInputDto {
  if (!editing) {
    return { name: '', type: 'bank', institution: '', currency: 'COP', initialBalance: 0, color: '#3b82f6', icon: 'wallet' };
  }
  return {
    name: editing.name,
    type: editing.type,
    institution: editing.institution ?? '',
    currency: editing.currency,
    initialBalance: editing.initialBalance,
    color: editing.color,
    icon: editing.icon,
  };
}

export function AccountFormDialog({ open, onOpenChange, editing, onSaved }: AccountFormDialogProps) {
  const form = useForm<AccountInputDto>({
    resolver: zodResolver(accountInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing ? await updateAccountAction({ ...values, id: editing.id }) : await createAccountAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Cuenta actualizada.' : 'Cuenta creada.');
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Cambiar la moneda no convierte los montos de transacciones ya registradas.'
              : 'Cuentas, tarjetas o billeteras donde manejas tu dinero.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Bancolombia Ahorros" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-danger">{form.formState.errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Moneda</Label>
              <Controller
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="institution">Institución (opcional)</Label>
            <Input id="institution" placeholder="Ej. Bancolombia" {...form.register('institution')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="initialBalance">{editing ? 'Saldo inicial' : 'Saldo con el que empieza'}</Label>
            <Input id="initialBalance" type="number" step="0.01" min="0" {...form.register('initialBalance')} />
            {form.formState.errors.initialBalance && (
              <p className="text-xs text-danger">{form.formState.errors.initialBalance.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cuenta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
