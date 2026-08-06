'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useClients } from '@/presentation/hooks/useClients';
import { getIcon } from '@/shared/config/iconMap';
import { formatMoney } from '@/shared/lib/format';
import type { Client } from '@/domain/entities/Client';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/presentation/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { ClientFormDialog } from './ClientFormDialog';
import { DeleteClientDialog } from './DeleteClientDialog';

interface ClientsViewProps {
  userId: string;
  initialData: Client[];
}

export function ClientsView({ userId, initialData }: ClientsViewProps) {
  const queryClient = useQueryClient();
  const { data: clients } = useClients(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['clients', userId] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">A quién le facturas tus ingresos freelance.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Nuevo cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes clientes.</p>
          <p className="mt-1 text-sm text-muted-foreground">Créalos para asociarlos a tus transacciones de ingreso.</p>
        </div>
      ) : (
        <div className="glass rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Facturación total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const Icon = getIcon(client.icon);
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${client.color}26`, color: client.color }}
                        >
                          <Icon className="size-4" />
                        </div>
                        <span className="font-medium text-foreground">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.status === 'active' ? 'success' : 'outline'}>
                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular text-right font-medium text-success">
                      {formatMoney(client.totalIncome)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(client);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onClick={() => setDeleting(client)}>
                            <Trash2 className="size-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <DeleteClientDialog
        client={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
