'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { clientInputSchema, type ClientInputDto } from '@/application/dto/client';
import { createClientAction, updateClientAction } from '@/app/(dashboard)/clients/actions';
import type { Client } from '@/domain/entities/Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/presentation/components/ui/dialog';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';
import { Textarea } from '@/presentation/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';
import { ColorPicker } from '@/presentation/components/modules/shared/ColorPicker';
import { IconPicker } from '@/presentation/components/modules/shared/IconPicker';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Client | null;
  onSaved: () => void;
}

function toFormValues(editing: Client | null): ClientInputDto {
  if (!editing) return { name: '', color: '#14b8a6', icon: 'briefcase', status: 'active', notes: '' };
  return {
    name: editing.name,
    color: editing.color,
    icon: editing.icon,
    status: editing.status,
    notes: editing.notes ?? '',
  };
}

export function ClientFormDialog({ open, onOpenChange, editing, onSaved }: ClientFormDialogProps) {
  const form = useForm<ClientInputDto>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: toFormValues(editing),
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(editing));
  }, [open, editing, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const result = editing
      ? await updateClientAction({ ...values, id: editing.id })
      : await createClientAction(values);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editing ? 'Cliente actualizado.' : 'Cliente creado.');
    onSaved();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            Para llevar el registro de a quién le facturas tus ingresos freelance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Acme Inc." {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-danger">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Estado</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" rows={3} {...form.register('notes')} />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
