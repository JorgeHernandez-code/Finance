'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  PiggyBank,
  Pause,
  Play,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { useSavingsGoals } from '@/presentation/hooks/useSavingsGoals';
import { formatMaybeMoney, formatMoney, formatPercent } from '@/shared/lib/format';
import { sortCurrencies, totalsBy } from '@/shared/lib/money';
import { todayIso } from '@/shared/lib/dates';
import { getIcon } from '@/shared/config/iconMap';
import { GOAL_STATUS_LABEL, type SavingsGoal } from '@/domain/entities/SavingsGoal';
import { goalMetrics, runScenario, type GoalMetrics, type ScenarioResult } from '@/domain/finance/savings';
import type { SnapshotContribution } from '@/domain/finance/snapshot';
import type { Capacity } from '@/domain/finance/cashflow';
import { setSavingsGoalStatusAction } from '@/app/(dashboard)/savings/actions';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Progress } from '@/presentation/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { SavingsGoalFormDialog, type GoalAccountOption } from './SavingsGoalFormDialog';
import { AddContributionDialog } from './AddContributionDialog';
import { DeleteSavingsGoalDialog } from './DeleteSavingsGoalDialog';
import { MoneyByCurrency } from '../shared/Money';

const METRIC_BADGE: Record<
  GoalMetrics['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'outline' }
> = {
  done: { label: 'Cumplida', variant: 'success' },
  on_track: { label: 'Al ritmo', variant: 'success' },
  behind: { label: 'Por debajo del ritmo', variant: 'warning' },
  overdue: { label: 'Fecha vencida', variant: 'warning' },
  no_date: { label: 'Sin fecha', variant: 'outline' },
  no_target: { label: 'Pendiente de cotización', variant: 'outline' },
  inactive: { label: 'Inactiva', variant: 'outline' },
};

interface SavingsGoalsViewProps {
  userId: string;
  initialData: SavingsGoal[];
  contributions: SnapshotContribution[];
  accounts: GoalAccountOption[];
  defaultCurrency: string;
  /** Capacidad mensual por moneda calculada con el historial real. */
  capacity: Record<string, Capacity>;
  /** Acceso rápido desde el dashboard: abrir "Nueva meta". */
  openNew?: boolean;
}

export function SavingsGoalsView({
  userId,
  initialData,
  contributions,
  accounts,
  defaultCurrency,
  capacity,
  openNew = false,
}: SavingsGoalsViewProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: goals } = useSavingsGoals(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(openNew);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null);

  const today = todayIso();
  const ctx = useMemo(() => ({ today, contributions }), [today, contributions]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['savings-goals', userId] });
    router.refresh();
  }

  async function setStatus(goal: SavingsGoal, status: SavingsGoal['status']) {
    const result = await setSavingsGoalStatusAction(goal.id, status);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Meta ${GOAL_STATUS_LABEL[status].toLowerCase()}. El historial se conserva.`);
      invalidate();
    }
  }

  const live = goals.filter((g) => g.status !== 'archived' && g.status !== 'cancelled');
  const saved = totalsBy(
    live,
    (g) => g.currency,
    (g) => g.currentAmount
  );
  const target = totalsBy(
    live,
    (g) => g.currency,
    (g) => g.targetAmount ?? 0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ahorros</h1>
          <div className="flex flex-wrap gap-x-2 text-sm text-muted-foreground">
            Apartado <MoneyByCurrency totals={saved} className="font-medium text-success" /> de{' '}
            <MoneyByCurrency totals={target} className="font-medium text-foreground" />
          </div>
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
          <p className="mt-1 text-sm text-muted-foreground">
            Un buen primer paso es una meta pequeña de fondo de emergencia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const m = goalMetrics(goal, ctx);
            const badge = METRIC_BADGE[m.status];
            const Icon = getIcon(goal.icon);
            const inactive =
              goal.status === 'paused' || goal.status === 'cancelled' || goal.status === 'archived';

            return (
              <Card key={goal.id} className={inactive ? 'opacity-70' : undefined}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
                          {goal.name}
                          {goal.isEmergencyFund && (
                            <ShieldCheck className="size-3.5 text-primary" aria-label="Fondo de emergencia" />
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Prioridad {goal.priority}
                          {goal.targetDate &&
                            ` · meta ${format(parseISO(goal.targetDate), 'd MMM yyyy', { locale: es })}`}
                        </p>
                        {goal.notes && <p className="text-xs text-muted-foreground">{goal.notes}</p>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acciones de {goal.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setContributingGoal(goal)}>
                          <PiggyBank className="size-4" /> Aporte o retiro
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(goal);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        {goal.status === 'active' ? (
                          <DropdownMenuItem onClick={() => setStatus(goal, 'paused')}>
                            <Pause className="size-4" /> Pausar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setStatus(goal, 'active')}>
                            <Play className="size-4" /> Reactivar
                          </DropdownMenuItem>
                        )}
                        {goal.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => setStatus(goal, 'cancelled')}>
                            <XCircle className="size-4" /> Cancelar (conserva historial)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem destructive onClick={() => setDeleting(goal)}>
                          <Trash2 className="size-4" /> Eliminar con historial
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="tabular text-lg font-semibold text-foreground">
                      {formatMoney(goal.currentAmount, goal.currency)}
                    </p>
                    <Badge variant={inactive ? 'outline' : badge.variant}>
                      {inactive ? GOAL_STATUS_LABEL[goal.status] : badge.label}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                      <span>
                        Objetivo: {formatMaybeMoney(goal.targetAmount, goal.currency, 'por cotizar')}
                      </span>
                      <span>{formatPercent(m.percent)}</span>
                    </div>
                    <Progress value={m.percent} indicatorClassName="bg-success" />
                    {m.expectedPercent !== null && !inactive && m.remaining !== null && m.remaining > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Esperado a hoy: {formatPercent(m.expectedPercent)}
                      </p>
                    )}
                  </div>

                  {!inactive && m.remaining !== null && m.remaining > 0 && (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Pendiente</dt>
                      <dd className="tabular text-right">{formatMoney(m.remaining, goal.currency)}</dd>
                      {m.requiredMonthly !== null && (
                        <>
                          <dt className="text-muted-foreground">Necesario al mes</dt>
                          <dd className="tabular text-right">
                            {formatMoney(m.requiredMonthly, goal.currency)}
                          </dd>
                        </>
                      )}
                      {goal.plannedMonthlyContribution && (
                        <>
                          <dt className="text-muted-foreground">Aporte propuesto</dt>
                          <dd className="tabular text-right">
                            {formatMoney(goal.plannedMonthlyContribution, goal.currency)}
                          </dd>
                        </>
                      )}
                      <dt className="text-muted-foreground">Ritmo real (3 meses)</dt>
                      <dd className="tabular text-right">
                        {m.actualMonthlyPace > 0 ? formatMoney(m.actualMonthlyPace, goal.currency) : '—'}
                      </dd>
                      <dt className="text-muted-foreground">Fecha estimada</dt>
                      <dd className="text-right">
                        {m.estimatedCompletion
                          ? format(parseISO(m.estimatedCompletion), 'MMM yyyy', { locale: es })
                          : 'Sin datos de aportes'}
                        {m.estimateBasis === 'planned' && ' (según lo propuesto)'}
                      </dd>
                    </dl>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {live.some((g) => g.status === 'active') && (
        <ScenarioPanel goals={goals} ctx={ctx} capacity={capacity} defaultCurrency={defaultCurrency} />
      )}

      <SavingsGoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        accounts={accounts}
        defaultCurrency={defaultCurrency}
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

interface ScenarioPanelProps {
  goals: SavingsGoal[];
  ctx: { today: string; contributions: SnapshotContribution[] };
  capacity: Record<string, Capacity>;
  /** Acceso rápido desde el dashboard: abrir "Nueva meta". */
  openNew?: boolean;
  defaultCurrency: string;
}

/** Escenarios conservador / base / optimista. Simulación: no reserva ni mueve dinero. */
function ScenarioPanel({ goals, ctx, capacity, defaultCurrency }: ScenarioPanelProps) {
  const currencies = sortCurrencies(goals.filter((g) => g.status === 'active').map((g) => g.currency));
  const [currency, setCurrency] = useState(
    currencies.includes(defaultCurrency) ? defaultCurrency : (currencies[0] ?? defaultCurrency)
  );
  const [base, setBase] = useState('');
  const [extraIncome, setExtraIncome] = useState('');
  const [lowerExpenses, setLowerExpenses] = useState('');

  const cap = capacity[currency];
  const conservativeAmount = cap?.monthlySurplus ?? null;
  const baseAmount = base === '' ? null : Number(base);
  const optimisticAssumptions = [
    extraIncome ? `Supuesto: ${formatMoney(Number(extraIncome), currency)} más de ingreso al mes` : null,
    lowerExpenses ? `Supuesto: ${formatMoney(Number(lowerExpenses), currency)} menos de gasto al mes` : null,
  ].filter((x): x is string => x !== null);

  const scenarios: ScenarioResult[] = [
    runScenario(goals, ctx, currency, { kind: 'conservative', monthlyAmount: conservativeAmount }),
    runScenario(goals, ctx, currency, { kind: 'base', monthlyAmount: baseAmount }),
    runScenario(goals, ctx, currency, {
      kind: 'optimistic',
      monthlyAmount:
        baseAmount === null && !extraIncome && !lowerExpenses
          ? null
          : (baseAmount ?? Math.max(0, conservativeAmount ?? 0)) +
            Number(extraIncome || 0) +
            Number(lowerExpenses || 0),
      assumptions: optimisticAssumptions,
    }),
  ];

  const titles = { conservative: 'Conservador', base: 'Base', optimistic: 'Optimista' } as const;
  const subtitles = {
    conservative: 'Solo lo que parece disponible tras lo esencial y las cuotas, según tu historial.',
    base: 'El monto mensual que tú eliges.',
    optimistic: 'Base + supuestos de más ingreso o menos gasto (no son hechos).',
  } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planificador de ahorro</CardTitle>
        <p className="text-sm text-muted-foreground">
          Reparte un monto mensual entre tus metas activas por prioridad. Es una simulación: no aparta dinero
          ni cambia tus metas, presupuestos o deudas.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          {currencies.length > 1 &&
            currencies.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={c === currency ? 'default' : 'outline'}
                onClick={() => setCurrency(c)}
              >
                {c}
              </Button>
            ))}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Monto base al mes</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              className="w-40"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Supuesto: más ingreso</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              className="w-40"
              value={extraIncome}
              onChange={(e) => setExtraIncome(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Supuesto: menos gasto</span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              className="w-40"
              value={lowerExpenses}
              onChange={(e) => setLowerExpenses(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {scenarios.map((s) => (
            <div key={s.kind} className="flex flex-col gap-2 rounded-md border border-border p-4 text-sm">
              <div>
                <p className="font-medium">{titles[s.kind]}</p>
                <p className="text-xs text-muted-foreground">{subtitles[s.kind]}</p>
              </div>
              <p className="tabular font-semibold">
                {s.monthlyAmount === null ? 'Sin dato' : `${formatMoney(s.monthlyAmount, currency)} / mes`}
              </p>
              {s.assumptions.map((a) => (
                <Badge key={a} variant="outline" className="w-fit">
                  {a}
                </Badge>
              ))}
              <p className="text-xs text-muted-foreground">{s.message}</p>
              <ul className="flex flex-col gap-1">
                {s.allocations.map((a) => (
                  <li key={a.goalId} className="flex justify-between gap-2 text-xs">
                    <span className="truncate">{a.name}</span>
                    <span className="tabular text-right">
                      {formatMoney(a.monthly, currency)}
                      {a.completion && ` → ${format(parseISO(a.completion), 'MMM yyyy', { locale: es })}`}
                      {a.meetsTargetDate === false && <span className="text-warning"> (tarde)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {cap?.status === 'deficit' && (
          <p className="text-sm text-warning">
            Con tus datos actuales, lo esencial y las cuotas superan tus ingresos. Antes de fijar aportes,
            revisa las alternativas en &ldquo;Mi plan&rdquo;.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
