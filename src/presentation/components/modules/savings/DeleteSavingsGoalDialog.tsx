'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteSavingsGoalAction } from '@/app/(dashboard)/savings/actions';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
import { formatMoney } from '@/shared/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';

interface DeleteSavingsGoalDialogProps {
  goal: SavingsGoal | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteSavingsGoalDialog({ goal, onOpenChange, onDeleted }: DeleteSavingsGoalDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!goal) return;
    setIsDeleting(true);
    const result = await deleteSavingsGoalAction(goal.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Meta de ahorro eliminada.');
    onDeleted();
  }

  return (
    <Dialog open={!!goal} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar meta de ahorro</DialogTitle>
          <DialogDescription>
            {goal && (
              <>
                Se eliminará &ldquo;{goal.name}&rdquo; y todo su historial de aportes (
                {goal.currentAmount > 0 ? formatMoney(goal.currentAmount) : 'sin aportes'}). Esta acción no se puede deshacer.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
