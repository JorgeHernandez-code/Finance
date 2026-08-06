'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteDebtAction } from '@/app/(dashboard)/debts/actions';
import type { Debt } from '@/domain/entities/Debt';
import { formatMoney } from '@/shared/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';

interface DeleteDebtDialogProps {
  debt: Debt | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteDebtDialog({ debt, onOpenChange, onDeleted }: DeleteDebtDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!debt) return;
    setIsDeleting(true);
    const result = await deleteDebtAction(debt.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Deuda eliminada.');
    onDeleted();
  }

  return (
    <Dialog open={!!debt} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar deuda</DialogTitle>
          <DialogDescription>
            {debt && (
              <>
                Se eliminará &ldquo;{debt.creditorName}&rdquo; y todo su historial de abonos ({debt.totalPaid > 0 ? formatMoney(debt.totalPaid) : 'sin abonos'}). Esta acción no se puede deshacer.
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

