'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { deleteCategoryAction, countCategoryBudgetsAction } from '@/app/(dashboard)/categories/actions';
import type { Category } from '@/domain/entities/Category';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

interface DeleteCategoryDialogProps {
  category: Category | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/**
 * budgets.category_id es ON DELETE CASCADE — borrar una categoría con
 * presupuestos activos los borra también, para siempre. Mismo patrón de
 * "escribe el nombre" que DeleteAccountDialog cuando eso aplica.
 */
export function DeleteCategoryDialog({ category, onOpenChange, onDeleted }: DeleteCategoryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [budgetCount, setBudgetCount] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    setConfirmText('');
    setBudgetCount(null);
    if (!category) return;

    countCategoryBudgetsAction(category.id).then((result) => {
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setBudgetCount(result.count);
    });
  }, [category]);

  async function handleConfirm() {
    if (!category) return;
    setIsDeleting(true);
    const result = await deleteCategoryAction(category.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Categoría eliminada.');
    onDeleted();
  }

  const requiresTyping = (budgetCount ?? 0) > 0;
  const canConfirm = !requiresTyping || confirmText.trim() === category?.name;

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={requiresTyping ? 'flex items-center gap-2 text-danger' : undefined}>
            {requiresTyping && <AlertTriangle className="size-5" />} Eliminar categoría
          </DialogTitle>
          <DialogDescription>
            {category && budgetCount === null && 'Verificando presupuestos asociados...'}
            {category && budgetCount !== null && budgetCount > 0 && (
              <>
                &ldquo;{category.name}&rdquo; tiene <strong className="text-danger">{budgetCount}</strong> presupuesto
                {budgetCount === 1 ? '' : 's'} asociado{budgetCount === 1 ? '' : 's'}. Eliminarla los borra{' '}
                <strong>permanentemente</strong> también. Las transacciones no se borran, solo quedan sin categoría.
              </>
            )}
            {category && budgetCount === 0 && (
              <>
                Se eliminará &ldquo;{category.name}&rdquo;. Las transacciones que la usan no se borran, solo quedan sin
                categoría asignada.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {requiresTyping && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-category-name">
              Escribe <span className="font-semibold text-foreground">{category?.name}</span> para confirmar
            </Label>
            <Input id="confirm-category-name" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting || !canConfirm || budgetCount === null}>
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
