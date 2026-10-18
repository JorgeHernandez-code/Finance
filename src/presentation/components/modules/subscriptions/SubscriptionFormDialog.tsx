'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  subscriptionInputSchema,
  NO_CATEGORY,
  NO_ACCOUNT,
  NO_CYCLE,
  type SubscriptionInputDto,
} from '@/application/dto/subscription';
import { createSubscriptionAction, updateSubscriptionAction } from '@/app/(dashboard)/subscriptions/actions';
import { RECURRING_KIND_LABEL, type Subscription } from '@/domain/entities/Subscription';
import { todayIso } from '@/shared/lib/dates';
import { SelectField } from '../shared/FormField';
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

const CYCLE_LABELS: Record<NonNullable<SubscriptionInputDto['billingCycle']> | typeof NO_CYCLE, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  bimonthly: 'Cada dos meses',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  [NO_CYCLE]: 'Pendiente de confirmar',
};

interface SubscriptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: TransactionFormOptions;
  /** Deudas propias abiertas: una cuota de préstamo se enlaza para no contarla dos veces. */
  debts: { id: string; creditorName: string }[];
  editing: Subscription | null;
  onSaved: () => void;
}

function toFormValues(editing: Subscription | null): SubscriptionInputDto {
  if (!editing) {
    return {
      name: '',
      kind: 'subscription',
      isEssential: false,
      debtId: null,
      categoryId: null,
      accountId: null,
      amount: 0,
      currency: 'COP',
      billingCycle: 'monthly',
      nextBillingDate: todayIso(),
      amountIsEstimate: false,
      cycleConfirmed: true,
      notes: null,
      icon: 'refresh',
      color: '#f59e0b',
    };
  }
  return {
    name: editing.name,
    kind: editing.kind,
    isEssential: editing.isEssential,
    debtId: editing.debtId,
    categoryId: editing.categoryId,
    accountId: editing.accountId,
    amount: editing.amount,
    currency: editing.currency,
    billingCycle: editing.billingCycle,
    nextBillingDate: editing.nextBillingDate,
    amountIsEstimate: editing.amountIsEstimate,
    cycleConfirmed: editing.cycleConfirmed,
    notes: editing.notes,
    icon: editing.icon,
    color: editing.color,
  };
}

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  options,
  debts,
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
      <DialogContent className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}</DialogTitle>
          <DialogDescription>
            Arriendo, servicios, suscripciones, cuotas… El pago real se registra como movimiento cuando
            ocurre.
          </DialogDescription>
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
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <SelectField
                  label="Tipo"
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? 'other')}
                  options={Object.entries(RECURRING_KIND_LABEL).map(([value, label]) => ({ value, label }))}
                />
              )}
            />
            {form.watch('kind') === 'loan_installment' && (
              <Controller
                control={form.control}
                name="debtId"
                render={({ field }) => (
                  <SelectField
                    label="Deuda asociada"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    emptyLabel="Sin enlazar"
                    options={debts.map((d) => ({ value: d.id, label: d.creditorName }))}
                    hint="Enlazarla evita contar la cuota dos veces."
                  />
                )}
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" {...form.register('isEssential')} />
            Es un gasto esencial (necesario para vivir)
          </label>

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
                  <Select value={field.value ?? NO_CYCLE} onValueChange={field.onChange}>
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
              <p className="text-xs text-muted-foreground">Vacío si no conoces el día.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                {...form.register('amountIsEstimate')}
              />
              El importe es aproximado
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={!form.watch('cycleConfirmed')}
                onChange={(e) => form.setValue('cycleConfirmed', !e.target.checked)}
              />
              La frecuencia está pendiente de confirmar
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-notes">Notas (opcional)</Label>
            <Input id="sub-notes" maxLength={1000} {...form.register('notes')} />
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
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
