'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useBudgets } from '@/presentation/hooks/useBudgets';
import { getIcon } from '@/shared/config/iconMap';
import { formatMoney, formatPercent } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { todayIso } from '@/shared/lib/dates';
import { projectBudget } from '@/domain/finance/cashflow';
import type { Budget } from '@/domain/entities/Budget';
import type { CategoryOption } from '@/domain/entities/ReferenceOption';
import { Button } from '@/presentation/components/ui/button';
import { Card, CardContent } from '@/presentation/components/ui/card';
import { Progress } from '@/presentation/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { BudgetFormDialog } from './BudgetFormDialog';
import { DeleteBudgetDialog } from './DeleteBudgetDialog';

interface BudgetsViewProps {
  userId: string;
  initialData: Budget[];
  categories: CategoryOption[];
  /** Meses completos con movimientos: sin historial no se proyecta. */
  monthsOfHistory: number;
}

function ProjectionLine({ budget, monthsOfHistory }: { budget: Budget; monthsOfHistory: number }) {
  const p = projectBudget(
    { spent: budget.spentAmount, periodStart: budget.periodStart, periodEnd: budget.periodEnd },
    todayIso(),
    monthsOfHistory
  );
  if (p.projected === null) return <span>Proyección: {p.reason}</span>;
  return (
    <span className={p.projected > budget.amount ? 'text-warning' : undefined}>
      Proyección al cierre (aprox., a este ritmo): {formatMoney(p.projected, budget.currency)}
    </span>
  );
}

function progressTone(spentPercent: number, alertThresholdPercent: number): { bar: string; text: string } {
  if (spentPercent >= 100) return { bar: 'bg-danger', text: 'text-danger' };
  if (spentPercent >= alertThresholdPercent) return { bar: 'bg-warning', text: 'text-warning' };
  return { bar: 'bg-success', text: 'text-success' };
}

export function BudgetsView({ userId, initialData, categories, monthsOfHistory }: BudgetsViewProps) {
  const queryClient = useQueryClient();
  const { data: budgets } = useBudgets(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Límites por categoría para el mes (o año) en curso. Son una planificación: no cuentan como pagos.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Nuevo presupuesto
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes presupuestos.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea uno para controlar cuánto gastas por categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => {
            const Icon = getIcon(budget.categoryIcon);
            const tone = progressTone(budget.spentPercent, budget.alertThresholdPercent);

            return (
              <Card key={budget.id}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${budget.categoryColor}26`, color: budget.categoryColor }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{budget.categoryName}</p>
                        <p className="text-xs text-muted-foreground">
                          {budget.period === 'monthly' ? 'Mensual' : 'Anual'}
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
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(budget);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => setDeleting(budget)}>
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="tabular text-sm font-medium text-foreground">
                        {formatMoney(budget.spentAmount, budget.currency)}{' '}
                        <span className="text-muted-foreground">
                          / {formatMoney(budget.amount, budget.currency)}
                        </span>
                      </span>
                      <span className={cn('text-xs font-medium', tone.text)}>
                        {formatPercent(budget.spentPercent)}
                      </span>
                    </div>
                    <Progress value={Math.min(100, budget.spentPercent)} indicatorClassName={tone.bar} />
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      <span>
                        {budget.availableAmount >= 0
                          ? `Quedan ${formatMoney(budget.availableAmount, budget.currency)}`
                          : `Te pasaste por ${formatMoney(-budget.availableAmount, budget.currency)}`}{' '}
                        · periodo {budget.periodStart} a {budget.periodEnd}
                      </span>
                      <ProjectionLine budget={budget} monthsOfHistory={monthsOfHistory} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <DeleteBudgetDialog
        budget={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
