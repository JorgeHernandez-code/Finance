import { describe, expect, it } from 'vitest';
import {
  divideMoney,
  mergeTotals,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  totalsBy,
} from '@/shared/lib/money';
import { consolidate, findRate } from '@/domain/finance/fx';
import { TODAY } from './fixtures';

describe('aritmética monetaria', () => {
  it('no arrastra errores de coma flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney(Array.from({ length: 1000 }, () => 0.01))).toBe(10);
    expect(subtractMoney(1000.1, 0.3)).toBe(999.8);
  });

  it('redondea al centavo al multiplicar y dividir', () => {
    expect(multiplyMoney(100, 4.123456)).toBe(412.35);
    expect(divideMoney(100, 3)).toBe(33.33);
    expect(() => divideMoney(1, 0)).toThrow();
  });

  it('agrupa por moneda sin mezclar', () => {
    const totals = totalsBy(
      [
        { c: 'COP', a: 1000 },
        { c: 'CLP', a: 500 },
        { c: 'COP', a: 0.5 },
      ],
      (x) => x.c,
      (x) => x.a
    );
    expect(totals).toEqual({ COP: 1000.5, CLP: 500 });
    expect(mergeTotals(totals, { CLP: 1 })).toEqual({ COP: 1000.5, CLP: 501 });
  });
});

describe('conversión de monedas', () => {
  const rates = [
    { base: 'CLP', quote: 'COP', rate: 4.2, date: '2026-10-01' },
    { base: 'CLP', quote: 'COP', rate: 4.4, date: '2026-10-14' },
    { base: 'COP', quote: 'USD', rate: 0.00025, date: '2026-10-14' },
  ];

  it('usa la tasa más reciente no futura', () => {
    expect(findRate(rates, 'CLP', 'COP', TODAY)?.rate).toBe(4.4);
    expect(findRate(rates, 'CLP', 'COP', '2026-10-05')?.rate).toBe(4.2);
    expect(findRate(rates, 'CLP', 'COP', '2026-09-01')).toBeNull();
  });

  it('usa la inversa si la tasa está registrada en el otro sentido', () => {
    const r = findRate(rates, 'USD', 'COP', TODAY);
    expect(r?.inverted).toBe(true);
    expect(r?.rate).toBeCloseTo(4000);
  });

  it('consolida en COP y muestra la fecha de la tasa', () => {
    const c = consolidate({ COP: 1000, CLP: 100 }, 'COP', rates, TODAY);
    expect(c.total).toBe(1440);
    expect(c.complete).toBe(true);
    expect(c.oldestRateDate).toBe('2026-10-14');
  });

  it('nunca suma una moneda sin tasa: la excluye y lo indica', () => {
    const c = consolidate({ COP: 1000, EUR: 50 }, 'COP', rates, TODAY);
    expect(c.total).toBe(1000);
    expect(c.complete).toBe(false);
    expect(c.missingCurrencies).toEqual(['EUR']);
  });

  it('marca tasas desactualizadas', () => {
    const c = consolidate(
      { CLP: 100 },
      'COP',
      [{ base: 'CLP', quote: 'COP', rate: 4, date: '2026-09-01' }],
      TODAY
    );
    expect(c.hasStaleRate).toBe(true);
  });
});
