'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  subscriptionInputSchema,
  NO_CATEGORY,
  NO_ACCOUNT,
  type SubscriptionInputDto,
} from '@/application/dto/subscription';
import { createSubscriptionAction, updateSubscriptionAction } from '@/app/(dashboard)/subscriptions/actions';
import type { Subscription } from '@/domain/entities/Subscription';
import type { TransactionFormOptions } from '@/application/use-cases/transactions/GetTransactionFormOptions';
import { CURRENCIES } from '@/shared/config/currencies';
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

const CYCLE_LABELS: Record<SubscriptionInputDto['billingCycle'], string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

interface SubscriptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: TransactionFormOptions;
  editing: Subscription | null;
  onSaved: () => void;
}

function toFormValues(editing: Subscription | null): SubscriptionInputDto {
  if (!editing) {
    return {
      name: '',
      categoryId: null,
      accountId: null,
      amount: 0,
      currency: 'COP',
      billingCycle: 'monthly',
      nextBillingDate: new Date().toISOString().slice(0, 10),
      icon: 'refresh',
      color: '#f59e0b',
    };
  }
  return {
    name: editing.name,
    categoryId: editing.categoryId,
    accountId: editing.accountId,
    amount: editing.amount,
    currency: editing.currency,
    billingCycle: editing.billingCycle,
    nextBillingDate: editing.nextBillingDate,
    icon: editing.icon,
    color: editing.color,
  };
}

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  options,
  editing,
  onSaved,
}: SubscriptionFormDialogProps) {
  const form = useForm<SubscriptionInputDto>({
    resolver: zodResolver(subscriptionInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing
      ? await updateSubscriptionAction({ ...values, id: editing.id })
      : await createSubscriptionAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Suscripción actualizada.' : 'Suscripción creada.');
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar suscripción' : 'Nueva suscripción'}</DialogTitle>
          <DialogDescription>Pagos recurrentes como streaming, software o membresías.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Netflix" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" {...form.register('amount')} />
              {form.formState.errors.amount && (
                <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>
              )}
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
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Ciclo de facturación</Label>
              <Controller
                control={form.control}
                name="billingCycle"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CYCLE_LABELS).map(([value, label]) => (
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
              <Label htmlFor="nextBillingDate">Próximo cobro</Label>
              <Input id="nextBillingDate" type="date" {...form.register('nextBillingDate')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cuenta de cobro (opcional)</Label>
            <Controller
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <Select value={field.value ?? NO_ACCOUNT} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCOUNT}>Ninguna</SelectItem>
                    {options.accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoría (opcional)</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value ?? NO_CATEGORY} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Ninguna</SelectItem>
                    {options.categories
                      .filter((c) => c.type === 'expense')
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
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
              {form.formState.isSubmitting
                ? 'Guardando...'
                : editing
                  ? 'Guardar cambios'
                  : 'Crear suscripción'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
