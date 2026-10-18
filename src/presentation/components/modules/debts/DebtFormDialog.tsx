'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { createDebtAction, updateDebtAction } from '@/app/(dashboard)/debts/actions';
import type { DebtInputDto } from '@/application/dto/debt';
import {
  DEBT_KIND_LABEL,
  DEBT_STATUS_LABEL,
  type Debt,
  type DebtKind,
  type DebtStatus,
} from '@/domain/entities/Debt';
import { CURRENCIES } from '@/shared/config/currencies';
import { todayIso } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Textarea } from '@/presentation/components/ui/textarea';
import { Field, SelectField } from '../shared/FormField';

interface DebtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Debt | null;
  defaultCurrency: string;
  onSaved: () => void;
}

interface FormState {
  creditorName: string;
  direction: 'i_owe' | 'owed_to_me';
  kind: DebtKind;
  currency: string;
  country: string | null;
  principalAmount: string;
  interestRate: string;
  interestRatePeriod: 'monthly' | 'annual' | null;
  startDate: string;
  dueDate: string;
  nextPaymentDate: string;
  installmentAmount: string;
  installmentsTotal: string;
  status: DebtStatus;
  priority: 'high' | 'medium' | 'low' | null;
  negotiable: 'yes' | 'no' | 'unknown';
  notes: string;
  amountIsEstimate: boolean;
  responsibility: 'own' | 'shared' | 'third_party';
  legalHolder: string;
  nextInstallmentNumber: string;
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

function toFormState(editing: Debt | null, defaultCurrency: string): FormState {
  if (!editing) {
    return {
      creditorName: '',
      direction: 'i_owe',
      kind: 'other',
      currency: defaultCurrency,
      country: null,
      principalAmount: '',
      interestRate: '',
      interestRatePeriod: null,
      startDate: todayIso(),
      dueDate: '',
      nextPaymentDate: '',
      installmentAmount: '',
      installmentsTotal: '',
      status: 'active',
      priority: null,
      negotiable: 'unknown',
      notes: '',
      amountIsEstimate: false,
      responsibility: 'own',
      legalHolder: '',
      nextInstallmentNumber: '',
    };
  }
  return {
    creditorName: editing.creditorName,
    direction: editing.direction,
    kind: editing.kind,
    currency: editing.currency,
    country: editing.country,
    principalAmount: str(editing.principalAmount),
    interestRate: str(editing.interestRate),
    interestRatePeriod: editing.interestRatePeriod,
    startDate: editing.startDate,
    dueDate: editing.dueDate ?? '',
    nextPaymentDate: editing.nextPaymentDate ?? '',
    installmentAmount: str(editing.installmentAmount),
    installmentsTotal: str(editing.installmentsTotal),
    status: editing.status,
    priority: editing.priority,
    negotiable: editing.negotiable,
    notes: editing.notes ?? '',
    amountIsEstimate: editing.amountIsEstimate,
    responsibility: editing.responsibility,
    legalHolder: editing.legalHolder ?? '',
    nextInstallmentNumber: str(editing.nextInstallmentNumber),
  };
}

/**
 * Solo son obligatorios acreedor, monto y moneda. Lo desconocido se deja
 * vacío y queda "pendiente de confirmar": nunca se rellena con valores inventados.
 */
export function DebtFormDialog({
  open,
  onOpenChange,
  editing,
  defaultCurrency,
  onSaved,
}: DebtFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(editing, defaultCurrency));
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(editing, defaultCurrency));
      setShowDetails(!!editing);
    }
  }, [open, editing, defaultCurrency]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const optional = (v: string) => (v.trim() === '' ? null : Number(v));
    const payload: DebtInputDto = {
      creditorName: form.creditorName,
      direction: form.direction,
      kind: form.kind,
      currency: form.currency,
      country: form.country,
      principalAmount: optional(form.principalAmount),
      amountIsEstimate: form.amountIsEstimate,
      responsibility: form.responsibility,
      legalHolder: form.legalHolder || null,
      nextInstallmentNumber: optional(form.nextInstallmentNumber),
      interestRate: optional(form.interestRate),
      interestRatePeriod: form.interestRatePeriod,
      startDate: form.startDate,
      dueDate: form.dueDate || null,
      nextPaymentDate: form.nextPaymentDate || null,
      installmentAmount: optional(form.installmentAmount),
      installmentsTotal: optional(form.installmentsTotal),
      status: form.status,
      priority: form.priority,
      negotiable: form.negotiable,
      notes: form.notes || null,
    };
    const result = editing
      ? await updateDebtAction({ ...payload, id: editing.id })
      : await createDebtAction(payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? 'Deuda actualizada.' : 'Deuda registrada.');
    onSaved();
  }

  const isMine = form.direction === 'i_owe';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar deuda' : 'Nueva deuda'}</DialogTitle>
          <DialogDescription>
            Si no conoces algún dato, déjalo vacío: quedará marcado como pendiente de confirmar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de deuda">
            {(['i_owe', 'owed_to_me'] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                role="radio"
                aria-checked={form.direction === direction}
                onClick={() => set('direction', direction)}
                className={cn(
                  'rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors',
                  form.direction === direction
                    ? direction === 'i_owe'
                      ? 'border-danger bg-danger/10 text-danger'
                      : 'border-success bg-success/10 text-success'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {direction === 'i_owe' ? 'Yo debo' : 'Me deben'}
              </button>
            ))}
          </div>

          <Field label={isMine ? 'Acreedor' : 'Deudor'} htmlFor="creditorName">
            <Input
              id="creditorName"
              required
              maxLength={100}
              placeholder="Ej. Banco, tarjeta, familiar"
              value={form.creditorName}
              onChange={(e) => set('creditorName', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Monto original o saldo"
              htmlFor="principalAmount"
              hint="Vacío si solo conoces la cuota"
            >
              <Input
                id="principalAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={form.principalAmount}
                onChange={(e) => set('principalAmount', e.target.value)}
              />
            </Field>
            <SelectField
              label="Moneda"
              value={form.currency}
              onChange={(v) => set('currency', v ?? defaultCurrency)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.label}` }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Tipo"
              value={form.kind}
              onChange={(v) => set('kind', (v as DebtKind) ?? 'other')}
              options={Object.entries(DEBT_KIND_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <SelectField
              label="País"
              value={form.country}
              onChange={(v) => set('country', v)}
              emptyLabel="Deducir de la moneda"
              options={[
                { value: 'CO', label: 'Colombia' },
                { value: 'CL', label: 'Chile' },
                { value: 'US', label: 'Estados Unidos' },
                { value: 'ES', label: 'España' },
              ]}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={form.amountIsEstimate}
              onChange={(e) => set('amountIsEstimate', e.target.checked)}
            />
            El importe es aproximado
          </label>

          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="flex items-center gap-1 self-start text-sm font-medium text-primary"
            aria-expanded={showDetails}
          >
            <ChevronDown className={cn('size-4 transition-transform', showDetails && 'rotate-180')} />
            {showDetails ? 'Ocultar detalles' : 'Cuotas, fechas, interés y negociación (opcional)'}
          </button>

          {showDetails && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Cuota acordada" htmlFor="installmentAmount" hint="Vacío si no hay cuota fija">
                  <Input
                    id="installmentAmount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.installmentAmount}
                    onChange={(e) => set('installmentAmount', e.target.value)}
                  />
                </Field>
                <Field label="Número de cuotas" htmlFor="installmentsTotal">
                  <Input
                    id="installmentsTotal"
                    type="number"
                    step="1"
                    min="1"
                    value={form.installmentsTotal}
                    onChange={(e) => set('installmentsTotal', e.target.value)}
                  />
                </Field>
                <Field label="Próxima cuota n.º" htmlFor="nextInstallmentNumber" hint="Según lo informado">
                  <Input
                    id="nextInstallmentNumber"
                    type="number"
                    step="1"
                    min="1"
                    value={form.nextInstallmentNumber}
                    onChange={(e) => set('nextInstallmentNumber', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Fecha de inicio" htmlFor="startDate">
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set('startDate', e.target.value)}
                  />
                </Field>
                <Field label="Próximo pago" htmlFor="nextPaymentDate" hint="Fecha acordada">
                  <Input
                    id="nextPaymentDate"
                    type="date"
                    value={form.nextPaymentDate}
                    onChange={(e) => set('nextPaymentDate', e.target.value)}
                  />
                </Field>
                <Field label="Vencimiento final" htmlFor="dueDate" hint="Vacío = sin fecha acordada">
                  <Input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => set('dueDate', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Interés %" htmlFor="interestRate" hint="Vacío = desconocido · 0 = sin interés">
                  <Input
                    id="interestRate"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.interestRate}
                    onChange={(e) => set('interestRate', e.target.value)}
                  />
                </Field>
                <SelectField
                  label="El interés es…"
                  value={form.interestRatePeriod}
                  onChange={(v) => set('interestRatePeriod', v as FormState['interestRatePeriod'])}
                  emptyLabel="No sé"
                  options={[
                    { value: 'monthly', label: 'Mensual' },
                    { value: 'annual', label: 'Anual (efectivo)' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SelectField
                  label="Estado"
                  value={form.status}
                  onChange={(v) => set('status', (v as DebtStatus) ?? 'active')}
                  options={Object.entries(DEBT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                />
                <SelectField
                  label="Prioridad"
                  value={form.priority}
                  onChange={(v) => set('priority', v as FormState['priority'])}
                  emptyLabel="Sin definir"
                  options={[
                    { value: 'high', label: 'Alta' },
                    { value: 'medium', label: 'Media' },
                    { value: 'low', label: 'Baja' },
                  ]}
                />
                <SelectField
                  label="¿Negociable?"
                  value={form.negotiable}
                  onChange={(v) => set('negotiable', (v as FormState['negotiable']) ?? 'unknown')}
                  options={[
                    { value: 'unknown', label: 'No sé' },
                    { value: 'yes', label: 'Sí' },
                    { value: 'no', label: 'No' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Responsabilidad"
                  value={form.responsibility}
                  onChange={(v) => set('responsibility', (v as FormState['responsibility']) ?? 'own')}
                  options={[
                    { value: 'own', label: 'Propia' },
                    { value: 'shared', label: 'Compartida' },
                    { value: 'third_party', label: 'A nombre de un tercero' },
                  ]}
                />
                <Field label="Titular legal (si no eres tú)" htmlFor="legalHolder">
                  <Input
                    id="legalHolder"
                    maxLength={120}
                    value={form.legalHolder}
                    onChange={(e) => set('legalHolder', e.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="Notas y acuerdos"
                htmlFor="notes"
                hint="Condiciones, consecuencias conocidas, acuerdos alcanzados…"
              >
                <Textarea
                  id="notes"
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </Field>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar deuda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
