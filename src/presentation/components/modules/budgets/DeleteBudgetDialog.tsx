'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteBudgetAction } from '@/app/(dashboard)/budgets/actions';
import type { Budget } from '@/domain/entities/Budget';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';

interface DeleteBudgetDialogProps {
  budget: Budget | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteBudgetDialog({ budget, onOpenChange, onDeleted }: DeleteBudgetDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!budget) return;
    setIsDeleting(true);
    const result = await deleteBudgetAction(budget.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Presupuesto eliminado.');
    onDeleted();
  }

  return (
    <Dialog open={!!budget} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar presupuesto</DialogTitle>
          <DialogDescription>
            {budget && (
              <>
                Se eliminará el presupuesto de &ldquo;{budget.categoryName}&rdquo;. No afecta tus transacciones.
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
