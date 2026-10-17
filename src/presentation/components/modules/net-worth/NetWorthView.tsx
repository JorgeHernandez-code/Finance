import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { NetWorth, NetWorthLine } from '@/domain/finance/netWorth';
import { formatMoney } from '@/shared/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Badge } from '@/presentation/components/ui/badge';
import { Progress } from '@/presentation/components/ui/progress';
import { ConsolidatedNote } from '../shared/Money';

const KIND_LABEL: Record<NetWorthLine['kind'], string> = {
  account: 'Cuenta',
  investment: 'Inversión',
  receivable: 'Cuenta por cobrar',
  debt: 'Deuda',
  negative_account: 'Cuenta en negativo',
};

function Lines({ title, lines, tone }: { title: string; lines: NetWorthLine[]; tone: 'success' | 'danger' }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada registrado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {lines.map((l, i) => (
              <li key={`${l.kind}-${l.label}-${i}`} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{l.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {KIND_LABEL[l.kind]}
                    {l.note ? ` · ${l.note}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span
                    className={`tabular font-medium ${tone === 'success' ? 'text-success' : 'text-danger'}`}
                  >
                    {formatMoney(l.amount, l.currency)}
                  </span>
                  <Badge variant={l.certainty === 'confirmed' ? 'success' : 'outline'} className="mt-0.5">
                    {l.certainty === 'confirmed' ? 'Confirmado' : 'Estimado'}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function NetWorthView({ netWorth, today }: { netWorth: NetWorth; today: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Patrimonio neto</h1>
        <p className="text-sm text-muted-foreground">
          Activos − pasivos, por moneda. Las reservas de ahorro ya están dentro de tus cuentas y no se suman
          dos veces.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {netWorth.byCurrency.length === 0 ? (
          <Card className="md:col-span-3">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Registra cuentas y deudas para calcular tu patrimonio.
            </CardContent>
          </Card>
        ) : (
          netWorth.byCurrency.map((c) => (
            <Card key={c.currency}>
              <CardContent className="flex flex-col gap-1 p-5">
                <span className="text-xs text-muted-foreground">{c.currency}</span>
                <span
                  className={`tabular text-2xl font-semibold ${c.net < 0 ? 'text-danger' : 'text-foreground'}`}
                >
                  {formatMoney(c.net, c.currency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Activos {formatMoney(c.assets, c.currency)} · Pasivos{' '}
                  {formatMoney(c.liabilities, c.currency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Solo con datos confirmados: {formatMoney(c.confirmedNet, c.currency)}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Integridad de los datos</span>
            <span className="tabular text-sm font-semibold">{netWorth.integrity}% confirmado</span>
          </div>
          <Progress value={netWorth.integrity} />
          <ConsolidatedNote consolidated={netWorth.netCop} />
          {netWorth.warnings.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {netWorth.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-muted-foreground">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> Todos los valores están confirmados.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Cálculo al {today}. No es una valoración oficial: depende de lo que hayas registrado. Las cuotas
            futuras de una deuda no se suman aparte de su saldo pendiente.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Lines title="Activos" lines={netWorth.assets} tone="success" />
        <Lines title="Pasivos" lines={netWorth.liabilities} tone="danger" />
      </div>
    </div>
  );
}
