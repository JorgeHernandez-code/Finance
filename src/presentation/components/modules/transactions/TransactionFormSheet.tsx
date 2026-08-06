'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { transactionInputSchema, type TransactionInputDto } from '@/application/dto/transaction';
import { createTransactionAction, updateTransactionAction } from '@/app/(dashboard)/transactions/actions';
import type { Transaction } from '@/domain/entities/Transaction';
import type { TransactionFormOptions } from '@/application/use-cases/transactions/GetTransactionFormOptions';
import { Sheet, SheetContent } from '@/presentation/components/ui/sheet';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/ui/select';
import { cn } from '@/shared/lib/utils';

const NO_CLIENT = 'none';

interface TransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: TransactionFormOptions;
  editing: Transaction | null;
  onSaved: () => void;
}

function toFormValues(editing: Transaction | null): TransactionInputDto {
  if (!editing) {
    return {
      accountId: '',
      categoryId: '',
      clientId: null,
      type: 'expense',
      amount: 0,
      description: '',
      notes: '',
      transactionDate: new Date().toISOString().slice(0, 10),
    };
  }
  return {
    accountId: editing.accountId,
    categoryId: editing.categoryId ?? '',
    clientId: editing.clientId,
    type: editing.type,
    amount: editing.amount,
    description: editing.description,
    notes: editing.notes ?? '',
    transactionDate: editing.transactionDate,
  };
}

/**
 * react-hook-form + zodResolver (en vez del patrón useActionState/FormData de
 * los formularios de auth) porque acá hay selects controlados, un toggle de
 * tipo y valores por defecto que cambian al editar — más simple de manejar
 * como estado de formulario que leyendo FormData a mano.
 */
export function TransactionFormSheet({ open, onOpenChange, options, editing, onSaved }: TransactionFormSheetProps) {
  const form = useForm<TransactionInputDto>({
    resolver: zodResolver(transactionInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const type = form.watch('type');
  const filteredCategories = options.categories.filter((c) => c.type === type);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = { ...values, clientId: values.clientId === NO_CLIENT ? null : values.clientId };
    const result = editing
      ? await updateTransactionAction({ ...payload, id: editing.id })
      : await createTransactionAction(payload);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Transacción actualizada.' : 'Transacción creada.');
    onSaved();
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <div>
          <h2 className="text-lg font-semibold">{editing ? 'Editar transacción' : 'Nueva transacción'}</h2>
          <p className="text-sm text-muted-foreground">
            {editing ? 'Actualiza los datos del movimiento.' : 'Registra un ingreso o gasto.'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                form.setValue('type', 'expense');
                form.setValue('categoryId', '');
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors',
                type === 'expense' ? 'border-danger bg-danger/10 text-danger' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <ArrowDownCircle className="size-4" /> Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                form.setValue('type', 'income');
                form.setValue('categoryId', '');
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors',
                type === 'income' ? 'border-success bg-success/10 text-success' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <ArrowUpCircle className="size-4" /> Ingreso
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Monto</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" {...form.register('amount')} />
            {form.formState.errors.amount && (
              <p className="text-xs text-danger">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" placeholder="Ej. Mercado semanal" {...form.register('description')} />
            {form.formState.errors.description && (
              <p className="text-xs text-danger">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cuenta</Label>
            <Controller
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.accountId && (
              <p className="text-xs text-danger">{form.formState.errors.accountId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoría</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
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

          <div className="flex flex-col gap-1.5">
            <Label>Cliente (opcional)</Label>
            <Controller
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <Select value={field.value ?? NO_CLIENT} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT}>Ninguno</SelectItem>
                    {options.clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transactionDate">Fecha</Label>
            <Input id="transactionDate" type="date" {...form.register('transactionDate')} />
            {form.formState.errors.transactionDate && (
              <p className="text-xs text-danger">{form.formState.errors.transactionDate.message}</p>
            )}
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
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear transacción'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
