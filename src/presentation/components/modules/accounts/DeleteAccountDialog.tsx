'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { deleteAccountAction, countAccountTransactionsAction } from '@/app/(dashboard)/accounts/actions';
import type { Account } from '@/domain/entities/Account';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

interface DeleteAccountDialogProps {
  account: Account | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/**
 * account_id en transactions es ON DELETE CASCADE — borrar una cuenta borra
 * TODAS sus transacciones para siempre. Por eso, si tiene alguna, se exige
 * escribir el nombre exacto de la cuenta antes de habilitar "Eliminar"
 * (mismo patrón que GitHub para borrar un repositorio).
 */
export function DeleteAccountDialog({ account, onOpenChange, onDeleted }: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [txCount, setTxCount] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setConfirmText('');
    setTxCount(null);
    if (!account) return;

    countAccountTransactionsAction(account.id).then((result) => {
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setTxCount(result.count);
    });
  }, [account]);

  async function handleConfirm() {
    if (!account) return;
    setIsDeleting(true);
    const result = await deleteAccountAction(account.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Cuenta eliminada.');
    onDeleted();
  }

  const requiresTyping = (txCount ?? 0) > 0;
  const canConfirm = !requiresTyping || confirmText.trim() === account?.name;

  return (
    <Dialog open={!!account} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <AlertTriangle className="size-5" /> Eliminar cuenta
          </DialogTitle>
          <DialogDescription>
            {account && txCount === null && 'Verificando transacciones asociadas...'}
            {account && txCount !== null && txCount > 0 && (
              <>
                &ldquo;{account.name}&rdquo; tiene <strong className="text-danger">{txCount}</strong> transacción
                {txCount === 1 ? '' : 'es'}. Eliminarla las borra <strong>permanentemente</strong>, no se puede deshacer.
              </>
            )}
            {account && txCount === 0 && <>&ldquo;{account.name}&rdquo; no tiene transacciones. Se puede eliminar sin riesgo.</>}
          </DialogDescription>
        </DialogHeader>

        {requiresTyping && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-name">
              Escribe <span className="font-semibold text-foreground">{account?.name}</span> para confirmar
            </Label>
            <Input id="confirm-name" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting || !canConfirm || txCount === null}>
            {isDeleting ? 'Eliminando...' : 'Eliminar definitivamente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
