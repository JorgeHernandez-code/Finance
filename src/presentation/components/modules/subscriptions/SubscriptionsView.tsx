'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, MoreHorizontal, Pencil, Trash2, Pause, Play, Ban, CheckCheck } from 'lucide-react';
import { useSubscriptions } from '@/presentation/hooks/useSubscriptions';
import {
  markSubscriptionReviewedAction,
  setSubscriptionStatusAction,
} from '@/app/(dashboard)/subscriptions/actions';
import { getIcon } from '@/shared/config/iconMap';
import { formatMoney } from '@/shared/lib/format';
import { totalsBy } from '@/shared/lib/money';
import { daysBetween, todayIso } from '@/shared/lib/dates';
import { cn } from '@/shared/lib/utils';
import { monthlyEquivalent } from '@/domain/finance/cashflow';
import {
  RECURRING_KIND_LABEL,
  type Subscription,
  type SubscriptionStatus,
} from '@/domain/entities/Subscription';
import { MoneyByCurrency } from '../shared/Money';
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

const STATUS_BADGE: Record<
  SubscriptionStatus,
  { label: string; variant: 'success' | 'warning' | 'outline' }
> = {
  active: { label: 'Activa', variant: 'success' },
  paused: { label: 'Pausada', variant: 'warning' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

const CYCLE_TEXT: Record<NonNullable<Subscription['billingCycle']>, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  bimonthly: 'Cada dos meses',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

interface SubscriptionsViewProps {
  userId: string;
  initialData: Subscription[];
  options: TransactionFormOptions;
  debts: { id: string; creditorName: string }[];
}

export function SubscriptionsView({ userId, initialData, options, debts }: SubscriptionsViewProps) {
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

  async function handleReviewed(subscription: Subscription) {
    const result = await markSubscriptionReviewedAction(subscription.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Marcada como revisada.');
    invalidate();
  }

  const active = subscriptions.filter((s) => s.status === 'active');
  // Sin frecuencia conocida no hay equivalente mensual: esos van aparte, nunca se suman.
  const withCycle = active.filter((s) => s.billingCycle !== null);
  const confirmedMonthly = totalsBy(
    withCycle.filter((s) => !s.amountIsEstimate && s.cycleConfirmed),
    (s) => s.currency,
    (s) => monthlyEquivalent(s) ?? 0
  );
  const estimatedMonthly = totalsBy(
    withCycle.filter((s) => s.amountIsEstimate || !s.cycleConfirmed),
    (s) => s.currency,
    (s) => monthlyEquivalent(s) ?? 0
  );
  const essentialMonthly = totalsBy(
    withCycle.filter((s) => s.isEssential),
    (s) => s.currency,
    (s) => monthlyEquivalent(s) ?? 0
  );
  const unknownCycle = active.filter((s) => s.billingCycle === null);
  const today = todayIso();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gastos recurrentes</h1>
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            Equivalente mensual confirmado:{' '}
            <MoneyByCurrency totals={confirmedMonthly} className="font-medium text-foreground" />
            {Object.keys(estimatedMonthly).length > 0 && (
              <>
                · aproximado o por confirmar:{' '}
                <MoneyByCurrency totals={estimatedMonthly} className="font-medium text-foreground" />
              </>
            )}
            {unknownCycle.length > 0 && <> · {unknownCycle.length} sin frecuencia conocida (no se suman)</>}
            {Object.keys(essentialMonthly).length > 0 && (
              <>
                · esenciales:{' '}
                <MoneyByCurrency totals={essentialMonthly} className="font-medium text-foreground" />
              </>
            )}
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Nuevo recurrente
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes suscripciones registradas.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrega Netflix, Spotify o cualquier pago recurrente.
          </p>
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
                        <DropdownMenuItem onClick={() => handleReviewed(subscription)}>
                          <CheckCheck className="size-4" /> Marcar como revisada
                        </DropdownMenuItem>
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
                      {RECURRING_KIND_LABEL[subscription.kind]}
                      {subscription.categoryName ? ` · ${subscription.categoryName}` : ''}
                      {subscription.accountName ? ` · ${subscription.accountName}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {subscription.isEssential && <Badge variant="default">Esencial</Badge>}
                      {subscription.status === 'active' &&
                        (!subscription.lastReviewedAt ||
                          daysBetween(subscription.lastReviewedAt, today) > 90) && (
                          <Badge variant="outline">Sin revisar en 90 días</Badge>
                        )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="tabular text-lg font-semibold text-foreground">
                        {subscription.amountIsEstimate ? '≈ ' : ''}
                        {formatMoney(subscription.amount, subscription.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subscription.billingCycle
                          ? CYCLE_TEXT[subscription.billingCycle]
                          : 'Frecuencia por confirmar'}
                        {subscription.billingCycle && !subscription.cycleConfirmed ? ' (por confirmar)' : ''}
                        {' · '}
                        {subscription.nextBillingDate
                          ? `Próximo cobro: ${format(parseISO(subscription.nextBillingDate), 'd MMM yyyy', { locale: es })}`
                          : 'Día de cobro por confirmar'}
                      </p>
                      {subscription.notes && (
                        <p className="text-xs text-muted-foreground">{subscription.notes}</p>
                      )}
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
        debts={debts}
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
