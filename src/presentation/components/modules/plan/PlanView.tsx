import Link from 'next/link';
import { CheckCircle2, Circle, MinusCircle, AlertTriangle } from 'lucide-react';
import type { FinancialPlan, Objective } from '@/domain/finance/plan';
import type { Commitments } from '@/domain/finance/cashflow';
import { isCheckinKey } from '@/domain/finance/checkins';
import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Badge } from '@/presentation/components/ui/badge';
import { Progress } from '@/presentation/components/ui/progress';
import { CheckinButton } from './CheckinButton';
import { MoneyByCurrency } from '../shared/Money';

interface PlanViewProps {
  plan: FinancialPlan;
  commitments: Commitments;
  defaultCurrency: string;
  checkins: {
    weekly_review: boolean;
    obligations_review: boolean;
    monthly_close: boolean;
    subscriptions_review: boolean;
  };
  monthCloseWindow: boolean;
}

function ObjectiveRow({ o }: { o: Objective }) {
  const Icon = o.state === 'done' ? CheckCircle2 : o.state === 'not_applicable' ? MinusCircle : Circle;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          o.state === 'done' ? 'text-success' : 'text-muted-foreground'
        )}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn('text-sm font-medium', o.state === 'not_applicable' && 'text-muted-foreground')}>
          {o.title}
          <span className="sr-only">
            {o.state === 'done' ? ' (hecho)' : o.state === 'not_applicable' ? ' (no aplica)' : ' (pendiente)'}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">{o.evidence}</span>
        {o.state === 'pending' && o.action && (
          <div>
            {'href' in o.action ? (
              <Link href={o.action.href} className="text-xs font-medium text-primary hover:underline">
                {o.action.label} →
              </Link>
            ) : isCheckinKey(o.action.checkin) ? (
              <CheckinButton actionKey={o.action.checkin} label={o.action.label} />
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}

export function PlanView({ plan, commitments, defaultCurrency, checkins, monthCloseWindow }: PlanViewProps) {
  const cap = plan.capacity;
  const cur = cap.currency;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Mi plan financiero</h1>
        <p className="text-sm text-muted-foreground">
          Seis etapas, evaluadas con tus datos reales. Avanzas a tu ritmo; cada paso cuenta.
        </p>
      </div>

      {plan.deficitWarning && (
        <Card className="border-warning/40">
          <CardContent className="flex items-start gap-3 p-5 text-sm">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <p>{plan.deficitWarning}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Tu mes en números ({cur})</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Ingreso promedio</p>
              <p className="tabular font-semibold">
                {cap.averageIncome === null ? 'Pendiente' : formatMoney(cap.averageIncome, cur)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Para vivir</p>
              <p className="tabular font-semibold">
                {cap.livingCost === null ? 'Pendiente' : formatMoney(cap.livingCost, cur)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cuotas de deudas</p>
              <p className="tabular font-semibold">{formatMoney(cap.debtInstallments, cur)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponible para deudas y ahorro</p>
              <p
                className={cn(
                  'tabular font-semibold',
                  cap.monthlySurplus !== null && cap.monthlySurplus < 0 && 'text-danger'
                )}
              >
                {cap.monthlySurplus === null ? 'Pendiente' : formatMoney(cap.monthlySurplus, cur)}
              </p>
            </div>
            <p className="col-span-full text-xs text-muted-foreground">
              {cap.status === 'unknown'
                ? 'Se calcula con al menos 2 meses completos de ingresos y gastos registrados. Mientras tanto no se estima nada.'
                : '"Para vivir" usa el mayor entre tu gasto real promedio (sin pagos de deudas) y tus recurrentes esenciales. No propongas pagos mayores al disponible.'}
            </p>
            {Object.keys(commitments.totalMonthly).length > 0 && (
              <p className="col-span-full text-xs text-muted-foreground">
                Compromisos mensuales registrados:{' '}
                <MoneyByCurrency totals={commitments.totalMonthly} className="inline-flex" />
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Rutinas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-2">
            <CheckinButton actionKey="weekly_review" done={checkins.weekly_review} />
            <CheckinButton actionKey="obligations_review" done={checkins.obligations_review} />
            <CheckinButton actionKey="subscriptions_review" done={checkins.subscriptions_review} />
            {(monthCloseWindow || checkins.monthly_close) && (
              <CheckinButton actionKey="monthly_close" done={checkins.monthly_close} />
            )}
            <p className="text-xs text-muted-foreground">
              Confirma cuando las hayas hecho de verdad: cuentan para tu índice y tus retos.
            </p>
          </CardContent>
        </Card>
      </div>

      <ol className="flex flex-col gap-4">
        {plan.stages.map((stage) => {
          const current = stage.number === plan.currentStage;
          const pct = stage.applicable ? Math.round((stage.done / stage.applicable) * 100) : 100;
          return (
            <li key={stage.number}>
              <Card className={cn(current && 'border-primary/50')}>
                <details open={current}>
                  <summary className="flex cursor-pointer list-none flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        Etapa {stage.number}. {stage.title}
                      </span>
                      <span className="flex items-center gap-2">
                        {current && <Badge>Etapa actual</Badge>}
                        {stage.complete && <Badge variant="success">Completa</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {stage.done}/{stage.applicable}
                        </span>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{stage.purpose}</span>
                    <Progress value={pct} />
                  </summary>
                  <CardContent className="pt-0">
                    <ul className="flex flex-col divide-y divide-border">
                      {stage.objectives.map((o) => (
                        <ObjectiveRow key={o.key} o={o} />
                      ))}
                    </ul>
                    {stage.number === 6 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Finance no recomienda inversiones concretas. Evalúa opciones solo cuando se cumplan
                        estas condiciones y, si lo necesitas, consulta a un asesor autorizado.
                      </p>
                    )}
                  </CardContent>
                </details>
              </Card>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Moneda principal: {defaultCurrency}. Educación y organización financiera; no constituye asesoría
        legal, tributaria ni de inversión.
      </p>
    </div>
  );
}
