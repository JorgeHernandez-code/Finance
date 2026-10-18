'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SavingsGoalInputDto } from '@/application/dto/savingsGoal';
import { createSavingsGoalAction, updateSavingsGoalAction } from '@/app/(dashboard)/savings/actions';
import { GOAL_STATUS_LABEL, type SavingsGoal, type SavingsGoalStatus } from '@/domain/entities/SavingsGoal';
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
import { ColorPicker } from '@/presentation/components/modules/shared/ColorPicker';
import { IconPicker } from '@/presentation/components/modules/shared/IconPicker';
import { Field, SelectField } from '../shared/FormField';

export interface GoalAccountOption {
  id: string;
  name: string;
  currency: string;
}

interface SavingsGoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SavingsGoal | null;
  accounts: GoalAccountOption[];
  defaultCurrency: string;
  onSaved: () => void;
}

interface FormState {
  name: string;
  targetAmount: string;
  currency: string;
  targetDate: string;
  accountId: string | null;
  priority: string;
  plannedMonthlyContribution: string;
  isEmergencyFund: boolean;
  icon: string;
  color: string;
  status: SavingsGoalStatus;
}

function toFormState(editing: SavingsGoal | null, defaultCurrency: string): FormState {
  if (!editing) {
    return {
      name: '',
      targetAmount: '',
      currency: defaultCurrency,
      targetDate: '',
      accountId: null,
      priority: '3',
      plannedMonthlyContribution: '',
      isEmergencyFund: false,
      icon: 'target',
      color: '#22c55e',
      status: 'active',
    };
  }
  return {
    name: editing.name,
    targetAmount: editing.targetAmount === null ? '' : String(editing.targetAmount),
    currency: editing.currency,
    targetDate: editing.targetDate ?? '',
    accountId: editing.accountId,
    priority: String(editing.priority),
    plannedMonthlyContribution: editing.plannedMonthlyContribution
      ? String(editing.plannedMonthlyContribution)
      : '',
    isEmergencyFund: editing.isEmergencyFund,
    icon: editing.icon,
    color: editing.color,
    status: editing.status,
  };
}

export function SavingsGoalFormDialog({
  open,
  onOpenChange,
  editing,
  accounts,
  defaultCurrency,
  onSaved,
}: SavingsGoalFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(editing, defaultCurrency));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(toFormState(editing, defaultCurrency));
  }, [open, editing, defaultCurrency]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const accountOptions = accounts.filter((a) => a.currency === form.currency);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const payload: SavingsGoalInputDto = {
      name: form.name,
      targetAmount: form.targetAmount.trim() === '' ? null : Number(form.targetAmount),
      currency: form.currency,
      targetDate: form.targetDate || null,
      accountId: accountOptions.some((a) => a.id === form.accountId) ? form.accountId : null,
      priority: Number(form.priority),
      plannedMonthlyContribution: form.plannedMonthlyContribution
        ? Number(form.plannedMonthlyContribution)
        : null,
      isEmergencyFund: form.isEmergencyFund,
      icon: form.icon,
      color: form.color,
      status: form.status,
    };
    const result = editing
      ? await updateSavingsGoalAction({ ...payload, id: editing.id })
      : await createSavingsGoalAction(payload);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? 'Meta actualizada.' : 'Meta creada.');
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}</DialogTitle>
          <DialogDescription>
            Los aportes son dinero que apartas dentro de tus cuentas: Finance no mueve dinero ni reserva nada
            por su cuenta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor="goal-name">
            <Input
              id="goal-name"
              required
              maxLength={80}
              placeholder="Ej. Fondo de emergencia"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={form.isEmergencyFund}
              onChange={(e) => set('isEmergencyFund', e.target.checked)}
            />
            Es mi fondo de emergencia
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Monto objetivo" htmlFor="goal-target" hint="Vacío si está pendiente de cotización">
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={form.targetAmount}
                onChange={(e) => set('targetAmount', e.target.value)}
              />
            </Field>
            <SelectField
              label="Moneda"
              value={form.currency}
              onChange={(v) => set('currency', v ?? defaultCurrency)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: c.code }))}
            />
            <Field label="Fecha objetivo" htmlFor="goal-date" hint="Opcional">
              <Input
                id="goal-date"
                type="date"
                value={form.targetDate}
                onChange={(e) => set('targetDate', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField
              label="Cuenta donde se aparta"
              value={form.accountId}
              onChange={(v) => set('accountId', v)}
              emptyLabel="Sin cuenta específica"
              options={accountOptions.map((a) => ({ value: a.id, label: a.name }))}
            />
            <SelectField
              label="Prioridad"
              value={form.priority}
              onChange={(v) => set('priority', v ?? '3')}
              options={[
                { value: '1', label: '1 · Máxima' },
                { value: '2', label: '2 · Alta' },
                { value: '3', label: '3 · Media' },
                { value: '4', label: '4 · Baja' },
                { value: '5', label: '5 · Mínima' },
              ]}
            />
            <Field label="Aporte mensual propuesto" htmlFor="goal-planned" hint="Lo que crees poder aportar">
              <Input
                id="goal-planned"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.plannedMonthlyContribution}
                onChange={(e) => set('plannedMonthlyContribution', e.target.value)}
              />
            </Field>
          </div>

          {editing && (
            <SelectField
              label="Estado"
              value={form.status}
              onChange={(v) => set('status', (v as SavingsGoalStatus) ?? 'active')}
              options={Object.entries(GOAL_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              hint="Pausar o cancelar conserva todo el historial de aportes."
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Ícono</Label>
              <IconPicker value={form.icon} onChange={(v) => set('icon', v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <ColorPicker value={form.color} onChange={(v) => set('color', v)} />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
