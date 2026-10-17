'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  deleteExchangeRateAction,
  saveExchangeRateAction,
  saveRiskToleranceAction,
} from '@/app/(dashboard)/settings/finance-actions';
import { CURRENCIES } from '@/shared/config/currencies';
import { todayIso } from '@/shared/lib/dates';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import { Field, SelectField } from '../shared/FormField';

export interface RateRow {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateDate: string;
  source: string | null;
}

interface Props {
  rates: RateRow[];
  riskTolerance: 'low' | 'medium' | 'high' | null;
}

export function FinanceSettingsCard({ rates, riskTolerance }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [base, setBase] = useState<string>('CLP');
  const [quote, setQuote] = useState<string>('COP');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(todayIso());
  const [source, setSource] = useState('');
  const currencyOptions = CURRENCIES.map((c) => ({ value: c.code, label: c.code }));

  function saveRate(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveExchangeRateAction({
        baseCurrency: base,
        quoteCurrency: quote,
        rate: Number(rate),
        rateDate: date,
        source: source || null,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success('Tasa guardada.');
        setRate('');
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monedas y perfil financiero</CardTitle>
        <p className="text-sm text-muted-foreground">
          Las tasas se usan solo para mostrar equivalentes consolidados en COP, siempre con su fecha. Sin
          tasa, Finance no suma monedas distintas. No se consulta ningún servicio externo.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={saveRate} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-6">
          <SelectField
            label="1 unidad de"
            value={base}
            onChange={(v) => setBase(v ?? 'CLP')}
            options={currencyOptions}
          />
          <SelectField
            label="equivale a"
            value={quote}
            onChange={(v) => setQuote(v ?? 'COP')}
            options={currencyOptions}
          />
          <Field label="Tasa" htmlFor="fx-rate">
            <Input
              id="fx-rate"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
          <Field label="Fecha" htmlFor="fx-date">
            <Input
              id="fx-date"
              type="date"
              required
              max={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Fuente (opcional)" htmlFor="fx-source">
            <Input
              id="fx-source"
              maxLength={100}
              placeholder="Banco, casa de cambio…"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={pending}>
            Guardar tasa
          </Button>
        </form>

        {rates.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {rates.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  1 {r.baseCurrency} = <span className="tabular font-medium">{r.rate}</span> {r.quoteCurrency}
                  <span className="text-muted-foreground">
                    {' '}
                    · {r.rateDate}
                    {r.source ? ` · ${r.source}` : ''}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Eliminar tasa"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteExchangeRateAction(r.id);
                      if (result.error) toast.error(result.error);
                      else router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay tasas registradas.</p>
        )}

        <div className="max-w-xs">
          <SelectField
            label="Tolerancia al riesgo"
            value={riskTolerance}
            emptyLabel="Sin definir"
            hint="Solo se usa en la etapa 6 del plan. Finance no recomienda inversiones concretas."
            options={[
              { value: 'low', label: 'Baja: prefiero no perder dinero' },
              { value: 'medium', label: 'Media' },
              { value: 'high', label: 'Alta: acepto variaciones fuertes' },
            ]}
            onChange={(v) =>
              startTransition(async () => {
                const result = await saveRiskToleranceAction(v);
                if (result.error) toast.error(result.error);
                else {
                  toast.success('Guardado.');
                  router.refresh();
                }
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
