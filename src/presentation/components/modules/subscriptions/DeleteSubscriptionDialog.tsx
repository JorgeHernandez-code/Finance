'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteSubscriptionAction } from '@/app/(dashboard)/subscriptions/actions';
import type { Subscription } from '@/domain/entities/Subscription';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';

interface DeleteSubscriptionDialogProps {
  subscription: Subscription | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteSubscriptionDialog({ subscription, onOpenChange, onDeleted }: DeleteSubscriptionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!subscription) return;
    setIsDeleting(true);
    const result = await deleteSubscriptionAction(subscription.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Suscripción eliminada.');
    onDeleted();
  }

  return (
    <Dialog open={!!subscription} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar suscripción</DialogTitle>
          <DialogDescription>
            {subscription && <>Se eliminará &ldquo;{subscription.name}&rdquo;. Esta acción no se puede deshacer.</>}
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
