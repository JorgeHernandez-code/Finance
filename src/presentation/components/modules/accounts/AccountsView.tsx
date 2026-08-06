'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { useAccounts } from '@/presentation/hooks/useAccounts';
import { setAccountArchivedAction } from '@/app/(dashboard)/accounts/actions';
import { getIcon } from '@/shared/config/iconMap';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import type { Account } from '@/domain/entities/Account';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent } from '@/presentation/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { AccountFormDialog } from './AccountFormDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const TYPE_LABELS: Record<Account['type'], string> = {
  cash: 'Efectivo',
  bank: 'Cuenta bancaria',
  digital_wallet: 'Billetera digital',
  credit_card: 'Tarjeta de crédito',
  other: 'Otra',
};

interface AccountsViewProps {
  userId: string;
  initialData: Account[];
}

function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggleArchived,
}: {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onToggleArchived: (account: Account) => void;
}) {
  const Icon = getIcon(account.icon);

  return (
    <Card className={cn(account.isArchived && 'opacity-60')}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <div
            className="flex size-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${account.color}26`, color: account.color }}
          >
            <Icon className="size-5" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Acciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchived(account)}>
                {account.isArchived ? (
                  <>
                    <ArchiveRestore className="size-4" /> Reactivar
                  </>
                ) : (
                  <>
                    <Archive className="size-4" /> Archivar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={() => onDelete(account)}>
                <Trash2 className="size-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">{account.name}</p>
          <p className="text-xs text-muted-foreground">
            {TYPE_LABELS[account.type]}
            {account.institution ? ` · ${account.institution}` : ''}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="tabular text-lg font-semibold text-foreground">
            {formatMoney(account.currentBalance, account.currency)}
          </p>
          {account.isArchived && <Badge variant="outline">Archivada</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export function AccountsView({ userId, initialData }: AccountsViewProps) {
  const queryClient = useQueryClient();
  const { data: accounts } = useAccounts(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function handleToggleArchived(account: Account) {
    const result = await setAccountArchivedAction(account.id, !account.isArchived);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(account.isArchived ? 'Cuenta reactivada.' : 'Cuenta archivada.');
    invalidate();
  }

  const active = accounts.filter((a) => !a.isArchived);
  const archived = accounts.filter((a) => a.isArchived);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cuentas</h1>
          <p className="text-sm text-muted-foreground">Dónde vive tu dinero: bancos, efectivo, billeteras y tarjetas.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nueva cuenta
        </Button>
      </div>

      {active.length === 0 && archived.length === 0 && (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes cuentas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Crea la primera para poder registrar transacciones.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={(a) => {
                setEditing(a);
                setDialogOpen(true);
              }}
              onDelete={setDeleting}
              onToggleArchived={handleToggleArchived}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">Archivadas</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={(a) => {
                  setEditing(a);
                  setDialogOpen(true);
                }}
                onDelete={setDeleting}
                onToggleArchived={handleToggleArchived}
              />
            ))}
          </div>
        </div>
      )}

      <AccountFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <DeleteAccountDialog
        account={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
