'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, MoreHorizontal, Pencil, Trash2, Pause, Play, Ban } from 'lucide-react';
import { useSubscriptions } from '@/presentation/hooks/useSubscriptions';
import { setSubscriptionStatusAction } from '@/app/(dashboard)/subscriptions/actions';
import { getIcon } from '@/shared/config/iconMap';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import type { Subscription, SubscriptionStatus } from '@/domain/entities/Subscription';
import type { TransactionFormOptions } from '@/application/use-cases/transactions/GetTransactionFormOptions';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent } from '@/presentation/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { SubscriptionFormDialog } from './SubscriptionFormDialog';
import { DeleteSubscriptionDialog } from './DeleteSubscriptionDialog';

const STATUS_BADGE: Record<SubscriptionStatus, { label: string; variant: 'success' | 'warning' | 'outline' }> = {
  active: { label: 'Activa', variant: 'success' },
  paused: { label: 'Pausada', variant: 'warning' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

function monthlyEquivalent(amount: number, cycle: Subscription['billingCycle']): number {
  if (cycle === 'weekly') return amount * 4.345;
  if (cycle === 'yearly') return amount / 12;
  return amount;
}

interface SubscriptionsViewProps {
  userId: string;
  initialData: Subscription[];
  options: TransactionFormOptions;
}

export function SubscriptionsView({ userId, initialData, options }: SubscriptionsViewProps) {
  const queryClient = useQueryClient();
  const { data: subscriptions } = useSubscriptions(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState<Subscription | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
  }

  async function handleStatusChange(subscription: Subscription, status: SubscriptionStatus) {
    const result = await setSubscriptionStatusAction(subscription.id, status);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Estado actualizado.');
    invalidate();
  }

  const activeMonthlyTotal = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billingCycle), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suscripciones</h1>
          <p className="text-sm text-muted-foreground">
            Pagos recurrentes · equivalente a{' '}
            <span className="font-medium text-foreground">{formatMoney(activeMonthlyTotal)}</span> al mes en activas.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Nueva suscripción
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes suscripciones registradas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Agrega Netflix, Spotify o cualquier pago recurrente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subscriptions.map((subscription) => {
            const Icon = getIcon(subscription.icon);
            const status = STATUS_BADGE[subscription.status];

            return (
              <Card key={subscription.id} className={cn(subscription.status === 'cancelled' && 'opacity-60')}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex size-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${subscription.color}26`, color: subscription.color }}
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
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(subscription);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        {subscription.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(subscription, 'paused')}>
                            <Pause className="size-4" /> Pausar
                          </DropdownMenuItem>
                        )}
                        {subscription.status !== 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(subscription, 'active')}>
                            <Play className="size-4" /> Reactivar
                          </DropdownMenuItem>
                        )}
                        {subscription.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(subscription, 'cancelled')}>
                            <Ban className="size-4" /> Cancelar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem destructive onClick={() => setDeleting(subscription)}>
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground">{subscription.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.categoryName ?? 'Sin categoría'}
                      {subscription.accountName ? ` · ${subscription.accountName}` : ''}
                    </p>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="tabular text-lg font-semibold text-foreground">
                        {formatMoney(subscription.amount, subscription.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Próximo cobro: {format(parseISO(subscription.nextBillingDate), 'd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SubscriptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        options={options}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <DeleteSubscriptionDialog
        subscription={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
