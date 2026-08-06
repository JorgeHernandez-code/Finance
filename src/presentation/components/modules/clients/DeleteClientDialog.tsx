'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteClientAction } from '@/app/(dashboard)/clients/actions';
import type { Client } from '@/domain/entities/Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';

interface DeleteClientDialogProps {
  client: Client | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteClientDialog({ client, onOpenChange, onDeleted }: DeleteClientDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!client) return;
    setIsDeleting(true);
    const result = await deleteClientAction(client.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Cliente eliminado.');
    onDeleted();
  }

  return (
    <Dialog open={!!client} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar cliente</DialogTitle>
          <DialogDescription>
            {client && (
              <>
                Se eliminará &ldquo;{client.name}&rdquo;. Las transacciones ligadas a él no se borran, solo quedan sin
                cliente asignado.
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
