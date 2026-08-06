'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteTransactionAction } from '@/app/(dashboard)/transactions/actions';
import type { Transaction } from '@/domain/entities/Transaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';

interface DeleteTransactionDialogProps {
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteTransactionDialog({ transaction, onOpenChange, onDeleted }: DeleteTransactionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!transaction) return;
    setIsDeleting(true);
    const result = await deleteTransactionAction(transaction.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Transacción eliminada.');
    onDeleted();
  }

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar transacción</DialogTitle>
          <DialogDescription>
            {transaction && (
              <>
                Esta acción elimina &ldquo;{transaction.description}&rdquo; ({transaction.transactionDate}). Puedes
                recuperarla más adelante desde soporte — se marca como eliminada, no se borra de la base de datos.
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
