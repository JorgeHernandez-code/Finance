import Link from 'next/link';
import type { Route } from 'next';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Flame,
  Info,
  Sparkles,
} from 'lucide-react';
import type { FinanceOverview } from '@/application/use-cases/finance/GetFinanceOverview';
import { formatMoney } from '@/shared/lib/format';
import { sortCurrencies } from '@/shared/lib/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Badge } from '@/presentation/components/ui/badge';
import { Progress } from '@/presentation/components/ui/progress';
import { IncomeExpenseChart } from '@/presentation/components/charts/IncomeExpenseChart';
import { CategoryDonutChart } from '@/presentation/components/charts/CategoryDonutChart';
import { ConsolidatedNote, MoneyByCurrency } from '../shared/Money';
import { CheckinButton } from '../plan/CheckinButton';
import { HealthScoreRing, CONFIDENCE_LABEL } from '../progress/HealthScoreBadge';
import { QuickActions } from './QuickActions';

const dateLabel = (iso: string) => format(parseISO(iso), 'd MMM', { locale: es });

function SectionTitle({
  children,
  href,
  linkLabel,
}: {
  children: React.ReactNode;
  href?: Route;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <CardTitle>{children}</CardTitle>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {linkLabel ?? 'Ver más'} <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground" title={hint}>
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function DashboardView({ data }: { data: FinanceOverview }) {
  const { availability, month, debts, health } = data;
  const cur = data.defaultCurrency;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tu centro de control</h1>
          <p className="text-sm text-muted-foreground">
            Todo calculado con lo que has registrado. Lo que falta confirmar se indica.
          </p>
        </div>
        {!data.weeklyReviewDone && data.hasAnyData && (
          <CheckinButton actionKey="weekly_review" label="Hice mi revisión semanal" />
        )}
      </div>

      <QuickActions />

      {!data.hasAnyData && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-6">
            <p className="font-medium">Empecemos por lo básico</p>
            <p className="text-sm text-muted-foreground">
              Registra tus cuentas (con su saldo actual) y tus deudas, aunque no conozcas todos los datos. Con
              eso Finance ya puede mostrarte cuánto tienes y cuánto debes.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/accounts" className="font-medium text-primary hover:underline">
                Agregar cuentas →
              </Link>
              <Link href="/debts" className="font-medium text-primary hover:underline">
                Registrar deudas →
              </Link>
              <Link href="/academy" className="font-medium text-primary hover:underline">
                Primera lección →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* A. Dinero disponible */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <SectionTitle href="/accounts" linkLabel="Cuentas">
              Dinero disponible
            </SectionTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {availability.byCurrency.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cuentas registradas.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availability.byCurrency.map((c) => (
                  <div key={c.currency} className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">{c.currency}</p>
                    <p className="tabular text-2xl font-semibold">{formatMoney(c.total, c.currency)}</p>
                    <div className="mt-2 flex flex-col text-xs">
                      <Row label="Confirmado (conciliado)">{formatMoney(c.confirmed, c.currency)}</Row>
                      {c.pendingConfirmation !== 0 && (
                        <Row label="Pendiente de confirmar">
                          <span className="text-warning">
                            {formatMoney(c.pendingConfirmation, c.currency)}
                          </span>
                        </Row>
                      )}
                      {c.reserved > 0 && (
                        <Row label="Reservado para metas">{formatMoney(c.reserved, c.currency)}</Row>
                      )}
                      <Row
                        label="Libre estimado"
                        hint="Saldo − reservas de ahorro. No descuenta pagos futuros."
                      >
                        <span
                          className={c.free < 0 ? 'font-medium text-danger' : 'font-medium text-foreground'}
                        >
                          {formatMoney(c.free, c.currency)}
                        </span>
                      </Row>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <ConsolidatedNote consolidated={availability.totalCop} />
            {Object.keys(data.commitments.totalMonthly).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Compromisos mensuales conocidos (recurrentes + cuotas):{' '}
                <MoneyByCurrency
                  totals={data.commitments.totalMonthly}
                  className="inline-flex font-medium text-foreground"
                />
              </p>
            )}
          </CardContent>
        </Card>

        {/* G. Bienestar financiero */}
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle href="/progress" linkLabel="Detalle">
              Índice de Salud Financiera
            </SectionTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <HealthScoreRing score={health.score} />
              <div className="flex flex-col gap-1 text-sm">
                <Badge variant="outline" className="w-fit">
                  {CONFIDENCE_LABEL[health.confidence]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Esta semana · indicador personal de organización, no un puntaje crediticio.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3.5 text-warning" /> Racha: {data.streak.current} semana(s)
              </span>
              <span>
                Nivel {data.level.level} · {data.level.name}
              </span>
            </div>
            <Progress value={data.level.progress} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* F. Próximas acciones */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <SectionTitle href="/plan" linkLabel="Mi plan">
              Próximas acciones
            </SectionTitle>
          </CardHeader>
          <CardContent>
            {data.actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {data.hasAnyData
                  ? 'No hay acciones pendientes con los datos actuales. Buen trabajo.'
                  : 'Aparecerán cuando registres tus primeros datos.'}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.actions.map((a) => (
                  <li key={a.key}>
                    <Link
                      href={a.href}
                      className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                    >
                      <span>
                        <span className="block text-sm font-medium">{a.title}</span>
                        <span className="block text-xs text-muted-foreground">{a.reason}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionTitle href="/calendar" linkLabel="Calendario">
              <span className="inline-flex items-center gap-1.5">
                <Bell className="size-4" /> Recordatorios
              </span>
            </SectionTitle>
          </CardHeader>
          <CardContent>
            {data.reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada en los próximos 14 días.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {data.reminders.slice(0, 6).map((r) => (
                  <li key={r.key}>
                    <Link
                      href={r.href}
                      className="flex items-center justify-between gap-2 hover:text-primary"
                    >
                      <span className="truncate">{r.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {r.date ? dateLabel(r.date) : 'Pendiente'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Recordatorios dentro de la app. Aún no se envían notificaciones externas.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* B. Resumen mensual */}
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle href="/reports" linkLabel="Reportes">
              Este mes
            </SectionTitle>
          </CardHeader>
          <CardContent>
            {month.movementCount === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos registrados este mes.</p>
            ) : (
              <div className="flex flex-col">
                <Row label="Ingresos recibidos">
                  <MoneyByCurrency totals={month.income} className="items-end text-success" />
                </Row>
                <Row label="Gastos pagados">
                  <MoneyByCurrency totals={month.expense} className="items-end text-danger" />
                </Row>
                <Row label="· de ellos, fijos">
                  <MoneyByCurrency totals={month.fixed} className="items-end" />
                </Row>
                <Row label="· suscripciones">
                  <MoneyByCurrency totals={month.subscriptions} className="items-end" />
                </Row>
                <Row label="· variables">
                  <MoneyByCurrency totals={month.variable} className="items-end" />
                </Row>
                <Row label="· pagos de deudas">
                  <MoneyByCurrency totals={month.debtPayments} className="items-end" />
                </Row>
                {Object.keys(month.debtPaymentsWithoutMovement).length > 0 && (
                  <Row
                    label="Abonos sin movimiento de cuenta"
                    hint="Pagos registrados en Deudas sin indicar la cuenta: no están dentro de los gastos."
                  >
                    <MoneyByCurrency
                      totals={month.debtPaymentsWithoutMovement}
                      className="items-end text-muted-foreground"
                    />
                  </Row>
                )}
                <Row label="Variación del saldo">
                  <MoneyByCurrency totals={month.balanceChange} className="items-end" />
                </Row>
                <Row
                  label="Ahorro real del mes"
                  hint="Ingresos − gastos. Puede ser negativo: es información, no un juicio."
                >
                  <MoneyByCurrency totals={month.realSaving} className="items-end font-semibold" />
                </Row>
              </div>
            )}
          </CardContent>
        </Card>

        {/* C. Deudas */}
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle href="/debts" linkLabel="Deudas">
              Deudas
            </SectionTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {debts.iOwe.count === 0 ? (
              <p className="text-sm text-muted-foreground">Sin deudas abiertas registradas.</p>
            ) : (
              <>
                <Row label="Debo (total)">
                  <MoneyByCurrency
                    totals={debts.iOwe.byCurrency}
                    className="items-end font-semibold text-danger"
                  />
                </Row>
                <ConsolidatedNote consolidated={debts.iOwe.totalCop} />
                <Row label="· confirmado">
                  <MoneyByCurrency totals={debts.iOwe.confirmedByCurrency} className="items-end" />
                </Row>
                <Row label="· estimado">
                  <MoneyByCurrency totals={debts.iOwe.estimatedByCurrency} className="items-end" />
                </Row>
                {Object.entries(debts.iOwe.byCountry).map(([country, totals]) => (
                  <Row
                    key={country}
                    label={`En ${country === 'CO' ? 'Colombia' : country === 'CL' ? 'Chile' : country === '??' ? 'país sin indicar' : country}`}
                  >
                    <MoneyByCurrency totals={totals} className="items-end" />
                  </Row>
                ))}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {debts.overdue.length > 0 && (
                    <Badge variant="danger">{debts.overdue.length} vencida(s)</Badge>
                  )}
                  {debts.upcoming.length > 0 && (
                    <Badge variant="warning">{debts.upcoming.length} vence(n) en 30 días</Badge>
                  )}
                  {debts.noDate.length > 0 && (
                    <Badge variant="outline">{debts.noDate.length} sin fecha</Badge>
                  )}
                  {debts.negotiating.length > 0 && (
                    <Badge variant="default">{debts.negotiating.length} en negociación/acuerdo</Badge>
                  )}
                  {debts.incomplete.length > 0 && (
                    <Badge variant="outline">{debts.incomplete.length} con datos por confirmar</Badge>
                  )}
                </div>
                {debts.upcoming.slice(0, 3).map((d) => (
                  <Row
                    key={d.id}
                    label={`${d.creditorName} · ${dateLabel((d.nextPaymentDate ?? d.dueDate)!)}`}
                  >
                    {d.installmentAmount ? formatMoney(d.installmentAmount, d.currency) : 'Cuota sin indicar'}
                  </Row>
                ))}
              </>
            )}
            {debts.owedToMe.count > 0 && (
              <Row label="Me deben">
                <MoneyByCurrency totals={debts.owedToMe.byCurrency} className="items-end text-success" />
              </Row>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* D. Objetivos */}
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle href="/savings" linkLabel="Ahorros">
              Objetivos
            </SectionTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin metas activas. Un fondo de emergencia pequeño es un buen comienzo.
              </p>
            ) : (
              data.goals.slice(0, 4).map(({ goal, metrics }) => (
                <div key={goal.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{goal.name}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {formatMoney(goal.currentAmount, goal.currency)} /{' '}
                      {formatMoney(goal.targetAmount, goal.currency)}
                    </span>
                  </div>
                  <Progress value={metrics.percent} indicatorClassName="bg-success" />
                  <p className="text-xs text-muted-foreground">
                    Falta {formatMoney(metrics.remaining, goal.currency)}
                    {goal.targetDate && ` · meta ${dateLabel(goal.targetDate)}`}
                    {metrics.requiredMonthly !== null &&
                      metrics.remaining > 0 &&
                      ` · necesitas ${formatMoney(metrics.requiredMonthly, goal.currency)}/mes`}
                    {goal.status === 'paused' && ' · en pausa'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* E. Actividad reciente */}
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle href="/transactions" linkLabel="Movimientos">
              Actividad reciente
            </SectionTitle>
          </CardHeader>
          <CardContent>
            {data.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad todavía.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border text-sm">
                {data.activity.map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{a.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {dateLabel(a.date)} ·{' '}
                        {
                          {
                            income: 'Ingreso',
                            expense: 'Gasto',
                            transfer: 'Entre cuentas',
                            debt_payment: 'Abono',
                            contribution: 'Ahorro',
                            withdrawal: 'Retiro de meta',
                          }[a.kind]
                        }
                      </span>
                    </span>
                    <span
                      className={
                        'tabular shrink-0 font-medium ' +
                        (a.kind === 'income'
                          ? 'text-success'
                          : a.kind === 'expense' || a.kind === 'debt_payment'
                            ? 'text-danger'
                            : 'text-foreground')
                      }
                    >
                      {formatMoney(a.amount, a.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retos de la semana */}
      {data.challenges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle href="/progress" linkLabel="Mi progreso">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-4" /> Retos de la semana
              </span>
            </SectionTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.challenges.map((c) => (
              <Link
                key={c.id}
                href={c.href as Route}
                className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm hover:bg-muted"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.title}</span>
                  {c.completed ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <span className="text-xs text-muted-foreground">+{c.xp} XP</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{c.progressLabel}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gráficos existentes, ahora en la moneda principal */}
      {data.monthlyHistory.some((m) => m.income > 0 || m.expense > 0) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos vs. gastos · {cur} · últimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeExpenseChart data={data.monthlyHistory} currency={cur} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gastos por categoría · {cur} · este mes</CardTitle>
            </CardHeader>
            <CardContent>
              {data.categoryBreakdown.length > 0 ? (
                <CategoryDonutChart data={data.categoryBreakdown} currency={cur} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sin gastos categorizados este mes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {sortCurrencies(Object.keys(month.expense)).some((c) => c !== cur) && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" /> Los gráficos muestran solo {cur}; los movimientos en otras monedas
          están en el resumen del mes.
        </p>
      )}
      {data.netWorth.warnings.length > 0 && (
        <Link
          href="/net-worth"
          className="flex items-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
          Integridad de los datos: {data.netWorth.integrity}% confirmado. {data.netWorth.warnings[0]}
        </Link>
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" /> Datos al{' '}
        {format(parseISO(data.today), "d 'de' MMMM yyyy", { locale: es })}.
      </p>
    </div>
  );
}
