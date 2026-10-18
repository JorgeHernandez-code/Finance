'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, MoreHorizontal, Pencil, Trash2, HandCoins, BadgeCheck, AlertCircle } from 'lucide-react';
import { useDebts } from '@/presentation/hooks/useDebts';
import { formatMaybeMoney, formatMoney, formatPercent } from '@/shared/lib/format';
import { sortCurrencies } from '@/shared/lib/money';
import { todayIso } from '@/shared/lib/dates';
import {
  COUNTRY_LABEL,
  DEBT_KIND_LABEL,
  DEBT_STATUS_LABEL,
  RESPONSIBILITY_LABEL,
  type Debt,
} from '@/domain/entities/Debt';
import {
  DEBT_GAP_LABEL,
  agreedDate,
  summarizeDebts,
  simulatePayoff,
  suggestDebtOrder,
  type DebtTimeline,
  type DebtView,
} from '@/domain/finance/debts';
import { emptySnapshot, type SnapshotRate } from '@/domain/finance/snapshot';
import { Button } from '@/presentation/components/ui/button';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Input } from '@/presentation/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/ui/dialog';
import { Progress } from '@/presentation/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/presentation/components/ui/dropdown-menu';
import { DebtFormDialog } from './DebtFormDialog';
import { AddPaymentDialog, type PaymentAccountOption, type PaymentCategoryOption } from './AddPaymentDialog';
import { ConfirmBalanceDialog } from './ConfirmBalanceDialog';
import { DeleteDebtDialog } from './DeleteDebtDialog';
import { ConsolidatedNote, MoneyByCurrency } from '../shared/Money';
import { CheckinButton } from '../plan/CheckinButton';

const TIMELINE_BADGE: Record<
  DebtTimeline,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'outline' | 'default' }
> = {
  paid: { label: 'Pagada', variant: 'success' },
  overdue: { label: 'Vencida', variant: 'danger' },
  due_soon: { label: 'Vence pronto', variant: 'warning' },
  scheduled: { label: 'Al día', variant: 'default' },
  no_date: { label: 'Sin fecha acordada', variant: 'outline' },
};

interface DebtsViewProps {
  userId: string;
  initialData: Debt[];
  rates: SnapshotRate[];
  accounts: PaymentAccountOption[];
  expenseCategories: PaymentCategoryOption[];
  defaultCurrency: string;
  inventoryConfirmed: boolean;
  /** Acceso rápido desde el dashboard. */
  initialAction?: 'deuda' | 'pago';
}

export function DebtsView({
  userId,
  initialData,
  rates,
  accounts,
  expenseCategories,
  defaultCurrency,
  inventoryConfirmed,
  initialAction,
}: DebtsViewProps) {
  const queryClient = useQueryClient();
  const { data: debts } = useDebts(userId, initialData);
  const [dialogOpen, setDialogOpen] = useState(initialAction === 'deuda');
  const [choosingPayment, setChoosingPayment] = useState(initialAction === 'pago');
  const [editing, setEditing] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [confirming, setConfirming] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);

  const today = todayIso();
  const summary = useMemo(
    () => summarizeDebts({ ...emptySnapshot(today, defaultCurrency), debts, rates }),
    [debts, rates, today, defaultCurrency]
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['debts', userId] });
  }

  const open = summary.debts.filter((d) => d.timeline !== 'paid');
  const paid = summary.debts.filter((d) => d.timeline === 'paid');
  const mine = suggestDebtOrder(open.filter((d) => d.direction === 'i_owe'));
  const owedToMe = open.filter((d) => d.direction === 'owed_to_me');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Deudas</h1>
          <p className="text-sm text-muted-foreground">
            Ordenadas por prioridad sugerida: vencidas, prioridad marcada, interés conocido y saldo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!inventoryConfirmed && (
            <CheckinButton
              actionKey="debts_inventory"
              label="Confirmar que todas están registradas"
              variant="outline"
            />
          )}
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Nueva deuda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Debo en total</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <MoneyByCurrency
              totals={summary.iOwe.byCurrency}
              className="text-lg font-semibold text-danger"
              empty="Nada registrado"
            />
            <ConsolidatedNote consolidated={summary.iOwe.totalCop} />
            {summary.iOwe.unknownBalanceCount > 0 && (
              <p className="text-xs text-warning">
                {summary.iOwe.unknownBalanceCount} deuda(s) con saldo desconocido no están incluidas en el
                total.
              </p>
            )}
            {Object.keys(summary.iOwe.sharedOrThirdPartyByCurrency).length > 0 && (
              <p className="text-xs text-muted-foreground">
                De ese total, compartidas o a nombre de terceros:{' '}
                <MoneyByCurrency totals={summary.iOwe.sharedOrThirdPartyByCurrency} className="inline-flex" />
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Confirmado:{' '}
              <MoneyByCurrency totals={summary.iOwe.confirmedByCurrency} className="inline-flex" /> ·
              Estimado: <MoneyByCurrency totals={summary.iOwe.estimatedByCurrency} className="inline-flex" />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Por país</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {Object.keys(summary.iOwe.byCountry).length === 0 && <p className="text-muted-foreground">—</p>}
            {Object.entries(summary.iOwe.byCountry).map(([country, totals]) => (
              <div key={country} className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground">
                  {country === '??' ? 'País sin indicar' : (COUNTRY_LABEL[country] ?? country)}
                </span>
                <MoneyByCurrency totals={totals} className="items-end font-medium" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Me deben</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyByCurrency
              totals={summary.owedToMe.byCurrency}
              className="text-lg font-semibold text-success"
              empty="Nada registrado"
            />
            {Object.keys(summary.monthlyInstallments).length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Cuotas pactadas al mes:{' '}
                <MoneyByCurrency totals={summary.monthlyInstallments} className="inline-flex" />
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {summary.debts.length === 0 ? (
        <div className="glass rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-foreground">Todavía no tienes deudas registradas.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Regístralas aunque no conozcas todos los datos; lo desconocido queda como pendiente de confirmar.
          </p>
        </div>
      ) : (
        <>
          <DebtGrid
            title="Lo que debo"
            debts={mine}
            onPay={setPayingDebt}
            onConfirm={setConfirming}
            onEdit={(d) => {
              setEditing(d);
              setDialogOpen(true);
            }}
            onDelete={setDeleting}
          />
          {owedToMe.length > 0 && (
            <DebtGrid
              title="Lo que me deben"
              debts={owedToMe}
              onPay={setPayingDebt}
              onConfirm={setConfirming}
              onEdit={(d) => {
                setEditing(d);
                setDialogOpen(true);
              }}
              onDelete={setDeleting}
            />
          )}
          {mine.length > 0 && <PayoffSimulator debts={mine} />}
          {paid.length > 0 && (
            <details className="glass rounded-lg p-4 text-sm">
              <summary className="cursor-pointer font-medium">Pagadas ({paid.length})</summary>
              <ul className="mt-3 flex flex-col gap-1 text-muted-foreground">
                {paid.map((d) => (
                  <li key={d.id}>
                    {d.creditorName} ·{' '}
                    {formatMaybeMoney(d.principalAmount, d.currency, 'monto sin registrar')}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <DebtFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        defaultCurrency={defaultCurrency}
        onSaved={() => {
          setDialogOpen(false);
          invalidate();
        }}
      />
      <Dialog open={choosingPayment} onOpenChange={setChoosingPayment}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿A qué deuda corresponde el pago?</DialogTitle>
          </DialogHeader>
          {open.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay deudas abiertas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {open.map((d) => (
                <li key={d.id}>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      setChoosingPayment(false);
                      setPayingDebt(d);
                    }}
                  >
                    <span className="truncate">{d.creditorName}</span>
                    <span className="tabular text-xs text-muted-foreground">
                      {formatMaybeMoney(d.remainingBalance, d.currency)}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      <AddPaymentDialog
        debt={payingDebt}
        accounts={accounts}
        expenseCategories={expenseCategories}
        onOpenChange={(o) => !o && setPayingDebt(null)}
        onSaved={() => {
          setPayingDebt(null);
          invalidate();
        }}
      />
      <ConfirmBalanceDialog
        debt={confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        onSaved={() => {
          setConfirming(null);
          invalidate();
        }}
      />
      <DeleteDebtDialog
        debt={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          invalidate();
        }}
      />
    </div>
  );
}

interface DebtGridProps {
  title: string;
  debts: DebtView[];
  onPay: (d: Debt) => void;
  onConfirm: (d: Debt) => void;
  onEdit: (d: Debt) => void;
  onDelete: (d: Debt) => void;
}

function DebtGrid({ title, debts, onPay, onConfirm, onEdit, onDelete }: DebtGridProps) {
  if (debts.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {debts.map((debt) => {
          const badge = TIMELINE_BADGE[debt.timeline];
          const paidPercent =
            debt.principalAmount !== null && debt.principalAmount > 0
              ? Math.min(100, (debt.totalPaid / debt.principalAmount) * 100)
              : 0;
          const date = agreedDate(debt);
          return (
            <Card key={debt.id}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{debt.creditorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {DEBT_KIND_LABEL[debt.kind]}
                      {debt.resolvedCountry.country &&
                        ` · ${COUNTRY_LABEL[debt.resolvedCountry.country] ?? debt.resolvedCountry.country}`}
                      {debt.resolvedCountry.inferred && ' (por la moneda)'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Acciones de {debt.creditorName}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onPay(debt)}>
                        <HandCoins className="size-4" />{' '}
                        {debt.direction === 'i_owe' ? 'Registrar pago' : 'Registrar cobro'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onConfirm(debt)}>
                        <BadgeCheck className="size-4" /> Confirmar saldo / historial
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(debt)}>
                        <Pencil className="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive onClick={() => onDelete(debt)}>
                        <Trash2 className="size-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="tabular text-lg font-semibold text-foreground">
                    {formatMaybeMoney(debt.remainingBalance, debt.currency, 'Saldo por confirmar', {
                      approximate: debt.amountIsEstimate,
                    })}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {debt.status === 'negotiating' || debt.status === 'agreement' ? (
                      <Badge variant="default">{DEBT_STATUS_LABEL[debt.status]}</Badge>
                    ) : (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    )}
                    <Badge variant={debt.confirmed ? 'success' : 'outline'}>
                      {debt.confirmed ? 'Confirmado' : 'Estimado'}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                    <span>Pagado: {formatMoney(debt.totalPaid, debt.currency)}</span>
                    <span>{formatPercent(paidPercent)}</span>
                  </div>
                  <Progress value={paidPercent} indicatorClassName="bg-success" />
                  {debt.totalInterestAndFees > 0 && (
                    <p className="text-xs text-muted-foreground">
                      De lo pagado, {formatMoney(debt.totalInterestAndFees, debt.currency)} fueron intereses y
                      cargos.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {(debt.installmentAmount || debt.nextInstallmentNumber) && (
                    <span>
                      {debt.installmentAmount
                        ? `Cuota: ${formatMoney(debt.installmentAmount, debt.currency)}`
                        : 'Cuota por confirmar'}
                      {debt.nextInstallmentNumber
                        ? ` · próxima n.º ${debt.nextInstallmentNumber}${debt.installmentsTotal ? ` de ${debt.installmentsTotal}` : ''}`
                        : debt.installmentsTotal
                          ? ` · ${debt.installmentsTotal} cuotas`
                          : ''}
                    </span>
                  )}
                  {debt.responsibility !== 'own' && (
                    <span>
                      {RESPONSIBILITY_LABEL[debt.responsibility]}
                      {debt.legalHolder ? ` · titular: ${debt.legalHolder}` : ''}
                    </span>
                  )}
                  <span>
                    {date
                      ? `${debt.nextPaymentDate ? 'Próximo pago' : 'Vence'}: ${format(parseISO(date), 'd MMM yyyy', { locale: es })}`
                      : 'Sin fecha acordada'}
                  </span>
                </div>

                {debt.gaps.length > 0 && (
                  <details className="text-xs">
                    <summary className="flex cursor-pointer items-center gap-1 text-warning">
                      <AlertCircle className="size-3.5" /> {debt.gaps.length} dato(s) por confirmar
                    </summary>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {debt.gaps.map((g) => (
                        <li key={g}>{DEBT_GAP_LABEL[g]}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/** Compara avalancha vs. bola de nieve con un monto mensual que elige el usuario. */
function PayoffSimulator({ debts }: { debts: DebtView[] }) {
  const currencies = sortCurrencies(debts.map((d) => d.currency));
  const [currency, setCurrency] = useState(currencies[0] ?? 'COP');
  const [monthly, setMonthly] = useState('');
  const inCurrency = debts.filter((d) => d.currency === currency);
  const amount = Number(monthly);
  const results =
    amount > 0 ? (['avalanche', 'snowball'] as const).map((s) => simulatePayoff(inCurrency, amount, s)) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparar escenarios de pago</CardTitle>
        <p className="text-sm text-muted-foreground">
          Simulación con los datos registrados. No mueve dinero ni cambia tus deudas.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          {currencies.length > 1 && (
            <div className="flex gap-1" role="radiogroup" aria-label="Moneda">
              {currencies.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={c === currency ? 'default' : 'outline'}
                  onClick={() => setCurrency(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              ¿Cuánto podrías destinar al mes a estas deudas? ({currency})
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              className="w-56"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
          </label>
        </div>
        {results.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {results.map((r) => (
              <div key={r.strategy} className="rounded-md border border-border p-4 text-sm">
                <p className="font-medium">
                  {r.strategy === 'avalanche'
                    ? 'Avalancha (mayor interés primero)'
                    : 'Bola de nieve (menor saldo primero)'}
                </p>
                {r.feasible ? (
                  <>
                    <p className="mt-1">
                      {r.months} mes(es) · intereses estimados {formatMoney(r.totalInterest, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">Orden: {r.order.join(' → ')}</p>
                  </>
                ) : (
                  <p className="mt-1 text-warning">No es viable con este monto.</p>
                )}
                {r.warnings.map((w) => (
                  <p key={w} className="mt-1 text-xs text-muted-foreground">
                    {w}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Usa un monto que puedas pagar sin dejar de cubrir tus gastos esenciales. En &ldquo;Mi plan&rdquo;
          ves cuánto queda disponible según tu historial.
        </p>
      </CardContent>
    </Card>
  );
}
