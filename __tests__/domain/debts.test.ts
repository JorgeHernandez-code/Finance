import { describe, expect, it } from 'vitest';
import {
  debtTimeline,
  monthlyRate,
  resolveCountry,
  simulatePayoff,
  summarizeDebts,
  isBalanceConfirmed,
} from '@/domain/finance/debts';
import { debt, snap, TODAY } from './fixtures';

describe('deudas', () => {
  it('una deuda sin fecha acordada nunca es "vencida"', () => {
    expect(debtTimeline(debt({ dueDate: null, nextPaymentDate: null, startDate: '2019-01-01' }), TODAY)).toBe(
      'no_date'
    );
  });

  it('vencida solo con fecha acordada pasada o marcada por el usuario', () => {
    expect(debtTimeline(debt({ nextPaymentDate: '2026-10-01' }), TODAY)).toBe('overdue');
    expect(debtTimeline(debt({ status: 'overdue' }), TODAY)).toBe('overdue');
    expect(debtTimeline(debt({ nextPaymentDate: '2026-10-20' }), TODAY)).toBe('due_soon');
    expect(debtTimeline(debt({ dueDate: '2027-06-01' }), TODAY)).toBe('scheduled');
    expect(debtTimeline(debt({ status: 'paid', remainingBalance: 0 }), TODAY)).toBe('paid');
  });

  it('el país se deduce de la moneda si no se indicó (y se marca como deducido)', () => {
    expect(resolveCountry(null, 'CLP')).toEqual({ country: 'CL', inferred: true });
    expect(resolveCountry('CO', 'USD')).toEqual({ country: 'CO', inferred: false });
    expect(resolveCountry(null, 'USD')).toEqual({ country: null, inferred: false });
  });

  it('un saldo confirmado deja de estarlo si hubo pagos después o pasaron 90 días', () => {
    expect(
      isBalanceConfirmed(debt({ balanceConfirmedAt: '2026-10-01', balanceConfirmedAmount: 1 }), TODAY)
    ).toBe(true);
    expect(
      isBalanceConfirmed(
        debt({ balanceConfirmedAt: '2026-10-01', balanceConfirmedAmount: 1, paymentsSinceConfirmation: 1 }),
        TODAY
      )
    ).toBe(false);
    expect(
      isBalanceConfirmed(debt({ balanceConfirmedAt: '2026-06-01', balanceConfirmedAmount: 1 }), TODAY)
    ).toBe(false);
  });

  it('resume por país y moneda, confirmado vs estimado, sin mezclar monedas', () => {
    const s = snap({
      debts: [
        debt({
          currency: 'COP',
          remainingBalance: 1000,
          balanceConfirmedAt: '2026-10-10',
          balanceConfirmedAmount: 1000,
        }),
        debt({ currency: 'CLP', remainingBalance: 500 }),
        debt({ currency: 'COP', direction: 'owed_to_me', remainingBalance: 99 }),
      ],
    });
    const sum = summarizeDebts(s);
    expect(sum.iOwe.byCurrency).toEqual({ COP: 1000, CLP: 500 });
    expect(sum.iOwe.confirmedByCurrency).toEqual({ COP: 1000 });
    expect(sum.iOwe.estimatedByCurrency).toEqual({ CLP: 500 });
    expect(sum.iOwe.byCountry).toEqual({ CO: { COP: 1000 }, CL: { CLP: 500 } });
    expect(sum.owedToMe.byCurrency).toEqual({ COP: 99 });
    expect(sum.iOwe.totalCop.complete).toBe(false);
  });

  it('no supone si el interés es mensual o anual', () => {
    expect(monthlyRate({ interestRate: 2, interestRatePeriod: null })).toBeNull();
    expect(monthlyRate({ interestRate: 2, interestRatePeriod: 'monthly' })).toBeCloseTo(0.02);
    expect(monthlyRate({ interestRate: 12, interestRatePeriod: 'annual' })).toBeCloseTo(0.009489, 5);
  });
});

describe('simulación de pago', () => {
  const debts = [
    debt({
      creditorName: 'Tarjeta',
      remainingBalance: 1000,
      interestRate: 3,
      interestRatePeriod: 'monthly',
      installmentAmount: 50,
    }),
    debt({ creditorName: 'Amigo', remainingBalance: 300, interestRate: 0, installmentAmount: 0 }),
  ];

  it('avalancha paga menos intereses que bola de nieve', () => {
    const avalanche = simulatePayoff(debts, 200, 'avalanche');
    const snowball = simulatePayoff(debts, 200, 'snowball');
    expect(avalanche.feasible && snowball.feasible).toBe(true);
    expect(avalanche.totalInterest).toBeLessThan(snowball.totalInterest);
    expect(snowball.order[0]).toBe('Amigo');
  });

  it('no es viable si el monto no cubre las cuotas mínimas', () => {
    expect(simulatePayoff(debts, 10, 'avalanche').feasible).toBe(false);
  });

  it('advierte cuando el interés es desconocido', () => {
    const r = simulatePayoff([debt({ remainingBalance: 100, interestRate: 5 })], 50, 'avalanche');
    expect(r.months).toBe(2);
    expect(r.warnings[0]).toMatch(/desconocido/);
  });

  it('detecta pagos que no alcanzan a cubrir los intereses', () => {
    const r = simulatePayoff(
      [debt({ remainingBalance: 10_000, interestRate: 10, interestRatePeriod: 'monthly' })],
      500,
      'avalanche'
    );
    expect(r.feasible).toBe(false);
  });
});
