'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { addSavingsContributionAction } from '@/app/(dashboard)/savings/actions';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
import { formatMoney } from '@/shared/lib/format';
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
import { Field } from '../shared/FormField';

interface AddContributionDialogProps {
  goal: SavingsGoal | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddContributionDialog({ goal, onOpenChange, onSaved }: AddContributionDialogProps) {
  const [kind, setKind] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!goal) return;
    setKind('deposit');
    setAmount('');
    setDate(todayIso());
    setNotes('');
    setIdempotencyKey(crypto.randomUUID());
  }, [goal]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!goal) return;
    if (kind === 'withdrawal' && Number(amount) > goal.currentAmount) {
      toast.error('No puedes retirar más de lo apartado en esta meta.');
      return;
    }
    setSubmitting(true);
    const result = await addSavingsContributionAction({
      goalId: goal.id,
      amount: Number(amount),
      kind,
      contributionDate: date,
      notes: notes || null,
      idempotencyKey,
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(kind === 'deposit' ? 'Aporte registrado.' : 'Retiro registrado.');
    onSaved();
  }

  return (
    <Dialog open={!!goal} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Movimiento de la meta</DialogTitle>
          <DialogDescription>
            {goal && (
              <>
                &ldquo;{goal.name}&rdquo; tiene {formatMoney(goal.currentAmount, goal.currency)} apartados.
                Registra aquí lo que apartaste o usaste; Finance no mueve dinero entre cuentas.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
            {(['deposit', 'withdrawal'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  'rounded-md border border-border px-3 py-2 text-sm font-medium',
                  kind === k
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {k === 'deposit' ? 'Aporte' : 'Retiro'}
              </button>
            ))}
          </div>
          <Field label="Monto" htmlFor="contribution-amount">
            <Input
              id="contribution-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Fecha" htmlFor="contribution-date">
            <Input
              id="contribution-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Nota (opcional)" htmlFor="contribution-notes">
            <Input
              id="contribution-notes"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !idempotencyKey}>
              {submitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
