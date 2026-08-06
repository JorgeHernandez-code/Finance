'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteInvestmentAction } from '@/app/(dashboard)/investments/actions';
import type { Investment } from '@/domain/entities/Investment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';

interface DeleteInvestmentDialogProps {
  investment: Investment | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteInvestmentDialog({ investment, onOpenChange, onDeleted }: DeleteInvestmentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!investment) return;
    setIsDeleting(true);
    const result = await deleteInvestmentAction(investment.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Inversión eliminada.');
    onDeleted();
  }

  return (
    <Dialog open={!!investment} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar inversión</DialogTitle>
          <DialogDescription>
            {investment && (
              <>
                Se eliminará &ldquo;{investment.name}&rdquo; y todo su historial de valuaciones. Esta acción no se puede deshacer.
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
