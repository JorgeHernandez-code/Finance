'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { categoryInputSchema, NO_PARENT_CATEGORY, type CategoryInputDto } from '@/application/dto/category';
import { createCategoryAction, updateCategoryAction } from '@/app/(dashboard)/categories/actions';
import type { Category } from '@/domain/entities/Category';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/ui/select';
import { ColorPicker } from '@/presentation/components/modules/shared/ColorPicker';
import { IconPicker } from '@/presentation/components/modules/shared/IconPicker';
import { cn } from '@/shared/lib/utils';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing: Category | null;
  onSaved: () => void;
}

function toFormValues(editing: Category | null): CategoryInputDto {
  if (!editing) {
    return { name: '', type: 'expense', parentId: null, color: '#3b82f6', icon: 'tag' };
  }
  return {
    name: editing.name,
    type: editing.type,
    parentId: editing.parentId,
    color: editing.color,
    icon: editing.icon,
  };
}

export function CategoryFormDialog({ open, onOpenChange, categories, editing, onSaved }: CategoryFormDialogProps) {
  const form = useForm<CategoryInputDto>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const type = form.watch('type');
  // Solo un nivel de subcategorías: las opciones de "padre" son categorías
  // del mismo tipo que no tienen padre a su vez, excluyendo la que se edita.
  const parentOptions = categories.filter((c) => c.type === type && !c.parentId && c.id !== editing?.id);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing ? await updateCategoryAction({ ...values, id: editing.id }) : await createCategoryAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Categoría actualizada.' : 'Categoría creada.');
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Actualiza el nombre, color o ícono.' : 'Crea una categoría para clasificar tus transacciones.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                form.setValue('type', 'expense');
                form.setValue('parentId', null);
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors',
                type === 'expense' ? 'border-danger bg-danger/10 text-danger' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <ArrowDownCircle className="size-4" /> Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                form.setValue('type', 'income');
                form.setValue('parentId', null);
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors',
                type === 'income' ? 'border-success bg-success/10 text-success' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <ArrowUpCircle className="size-4" /> Ingreso
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Mascotas" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-danger">{form.formState.errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoría padre (opcional)</Label>
            <Controller
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <Select value={field.value ?? NO_PARENT_CATEGORY} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_CATEGORY}>Ninguna (categoría principal)</SelectItem>
                    {parentOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Ícono</Label>
              <Controller
                control={form.control}
                name="icon"
                render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <Controller
                control={form.control}
                name="color"
                render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
