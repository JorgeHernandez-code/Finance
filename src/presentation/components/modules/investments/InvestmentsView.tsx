'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  LineChart,
  Bitcoin,
  Home as HomeIcon,
  Briefcase,
  MoreHorizontal as OtherIcon,
} from 'lucide-react';
import { useInvestments } from '@/presentation/hooks/useInvestments';
import { formatMoney, formatPercent } from '@/shared/lib/format';
import type { Investment } from '@/domain/entities/Investment';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent } from '@/presentation/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { InvestmentFormDialog, INVESTMENT_TYPE_LABELS } from './InvestmentFormDialog';
import { AddValuationDialog } from './AddValuationDialog';
import { DeleteInvestmentDialog } from './DeleteInvestmentDialog';

const TYPE_ICON: Record<Investment['type'], typeof LineChart> = {
  stocks: LineChart,
  crypto: Bitcoin,
  real_estate: HomeIcon,
  business: Briefcase,
  other: OtherIcon,
};

interface InvestmentsViewProps {
  userId: string;
  initialData: Investment[];
}

export function InvestmentsView({ userId, initialData }: InvestmentsViewProps) {
  const queryClient = useQueryClient();
  const { data: investments } = useInvestments(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [valuatingInvestment, setValuatingInvestment] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['investments', userId] });
  }

  const totalInvested = investments.reduce((sum, i) => sum + i.amountInvested, 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inversiones</h1>
          <p className="text-sm text-muted-foreground">
            Invertido <span className="font-medium text-foreground">{formatMoney(totalInvested)}</span> · valor actual{' '}
            <span className="font-medium text-foreground">{formatMoney(totalCurrentValue)}</span> ·{' '}
            <span className={`font-medium ${totalGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
              {totalGainLoss >= 0 ? '+' : ''}
              {formatMoney(totalGainLoss)} ({formatPercent(totalGainLossPercent)})
            </span>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Nueva inversión
        </Button>
      </div>

      {investments.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes inversiones registradas.</p>
          <p className="mt-1 text-sm text-muted-foreground">Registra lo que has invertido y actualiza su valor con el tiempo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {investments.map((investment) => {
            const Icon = TYPE_ICON[investment.type];
            const isGain = investment.gainLoss >= 0;

            return (
              <Card key={investment.id}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Icon className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{investment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(investment.startDate), 'd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setValuatingInvestment(investment)}>
                          <RefreshCw className="size-4" /> Actualizar valor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(investment);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => setDeleting(investment)}>
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="tabular text-lg font-semibold text-foreground">{formatMoney(investment.currentValue)}</p>
                    <Badge variant="outline">{INVESTMENT_TYPE_LABELS[investment.type]}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Invertido: {formatMoney(investment.amountInvested)}</span>
                    <span className={`flex items-center gap-1 font-medium ${isGain ? 'text-success' : 'text-danger'}`}>
                      {isGain ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                      {isGain ? '+' : ''}
                      {formatMoney(investment.gainLoss)} ({formatPercent(investment.gainLossPercent)})
                    </span>
                  </div>

                  {investment.lastValuationDate && (
                    <p className="text-xs text-muted-foreground">
                      Última actualización: {format(parseISO(investment.lastValuationDate), 'd MMM yyyy', { locale: es })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <InvestmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <AddValuationDialog
        investment={valuatingInvestment}
        onOpenChange={(open) => !open && setValuatingInvestment(null)}
        onSaved={() => {
          setValuatingInvestment(null);
          invalidate();
        }}
      />

      <DeleteInvestmentDialog
        investment={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
