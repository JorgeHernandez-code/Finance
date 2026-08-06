'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, MoreHorizontal, Pencil, Trash2, PiggyBank } from 'lucide-react';
import { useSavingsGoals } from '@/presentation/hooks/useSavingsGoals';
import { formatMoney, formatPercent } from '@/shared/lib/format';
import { getIcon } from '@/shared/config/iconMap';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent } from '@/presentation/components/ui/card';
import { Progress } from '@/presentation/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { SavingsGoalFormDialog } from './SavingsGoalFormDialog';
import { AddContributionDialog } from './AddContributionDialog';
import { DeleteSavingsGoalDialog } from './DeleteSavingsGoalDialog';

const STATUS_BADGE: Record<SavingsGoal['status'], { label: string; variant: 'success' | 'warning' | 'default' }> = {
  active: { label: 'Activa', variant: 'warning' },
  completed: { label: 'Completada', variant: 'success' },
  archived: { label: 'Archivada', variant: 'default' },
};

interface SavingsGoalsViewProps {
  userId: string;
  initialData: SavingsGoal[];
}

export function SavingsGoalsView({ userId, initialData }: SavingsGoalsViewProps) {
  const queryClient = useQueryClient();
  const { data: goals } = useSavingsGoals(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['savings-goals', userId] });
  }

  const totalSaved = goals.filter((g) => g.status !== 'archived').reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.filter((g) => g.status !== 'archived').reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ahorros</h1>
          <p className="text-sm text-muted-foreground">
            Ahorrado <span className="font-medium text-success">{formatMoney(totalSaved)}</span> de{' '}
            <span className="font-medium text-foreground">{formatMoney(totalTarget)}</span>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Nueva meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes metas de ahorro.</p>
          <p className="mt-1 text-sm text-muted-foreground">Crea una meta y empieza a registrar tus aportes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const status = STATUS_BADGE[goal.status];
            const Icon = getIcon(goal.icon);
            const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;

            return (
              <Card key={goal.id}>
                <CardContent className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-9 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{goal.name}</p>
                        {goal.targetDate && (
                          <p className="text-xs text-muted-foreground">
                            Meta: {format(parseISO(goal.targetDate), 'd MMM yyyy', { locale: es })}
                          </p>
                        )}
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
                        <DropdownMenuItem onClick={() => setContributingGoal(goal)}>
                          <PiggyBank className="size-4" /> Registrar aporte
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(goal);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => setDeleting(goal)}>
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="tabular text-lg font-semibold text-foreground">{formatMoney(goal.currentAmount)}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>Objetivo: {formatMoney(goal.targetAmount)}</span>
                      <span>{formatPercent(progress)}</span>
                    </div>
                    <Progress value={progress} indicatorClassName="bg-success" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SavingsGoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />

      <AddContributionDialog
        goal={contributingGoal}
        onOpenChange={(open) => !open && setContributingGoal(null)}
        onSaved={() => {
          setContributingGoal(null);
          invalidate();
        }}
      />

      <DeleteSavingsGoalDialog
        goal={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}
