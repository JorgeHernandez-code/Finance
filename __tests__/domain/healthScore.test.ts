import { describe, expect, it } from 'vitest';
import { computeHealthScore } from '@/domain/finance/healthScore';
import { periodFor } from '@/shared/lib/dates';
import { account, debt, snap, tx, TODAY } from './fixtures';
import type { FinancialSnapshot } from '@/domain/finance/snapshot';

const week = periodFor('week', TODAY);

/** Usuario activo básico: una cuenta y movimientos varios días. */
function active(extra: Partial<FinancialSnapshot> = {}): FinancialSnapshot {
  const acc = account({ createdAt: '2026-09-01T00:00:00Z' });
  return snap({
    accounts: [acc],
    transactions: [
      tx({ date: '2026-09-02' }),
      tx({ date: '2026-09-03' }),
      tx({ date: '2026-10-12' }),
      tx({ date: '2026-10-13' }),
      tx({ date: '2026-10-14', type: 'income', amount: 1000 }),
    ],
    ...extra,
  });
}

const item = (h: ReturnType<typeof computeHealthScore>, key: string) =>
  h.components.flatMap((c) => c.items).find((i) => i.key === key)!;

describe('Índice de Salud Financiera', () => {
  it('sin datos suficientes muestra "en construcción" (score null)', () => {
    const h = computeHealthScore(snap({ accounts: [account()], transactions: [tx()] }), week);
    expect(h.score).toBeNull();
    expect(h.confidence).toBe('building');
  });

  it('es determinista', () => {
    const s = active();
    expect(computeHealthScore(s, week)).toEqual(computeHealthScore(s, week));
  });

  it('cinco componentes de 20 puntos y explicación por ítem', () => {
    const h = computeHealthScore(active(), week);
    expect(h.components).toHaveLength(5);
    for (const c of h.components) {
      expect(c.items.reduce((s, i) => s + i.max, 0)).toBe(20);
      for (const i of c.items) expect(i.detail.length).toBeGreaterThan(0);
    }
  });

  it('no penaliza deudas antiguas sin fecha acordada', () => {
    const base = computeHealthScore(active(), week);
    const withOld = computeHealthScore(
      active({ debts: [debt({ startDate: '2018-01-01', remainingBalance: 9_000_000 })] }),
      week
    );
    expect(item(withOld, 'agreed_payments').applicable).toBe(false);
    expect(item(base, 'agreed_payments').applicable).toBe(false);
  });

  it('el monto de la deuda no cambia el puntaje', () => {
    const small = computeHealthScore(
      active({ debts: [debt({ remainingBalance: 10, kind: 'bank_loan', interestRate: 0 })] }),
      week
    );
    const big = computeHealthScore(
      active({ debts: [debt({ remainingBalance: 10_000_000, kind: 'bank_loan', interestRate: 0 })] }),
      week
    );
    expect(small.score).toBe(big.score);
  });

  it('una cuota acordada en el periodo cuenta si se paga o se negocia', () => {
    const d = debt({ nextPaymentDate: '2026-10-14', installmentAmount: 100 });
    const unpaid = computeHealthScore(active({ debts: [d] }), week);
    expect(item(unpaid, 'agreed_payments').earned).toBe(0);
    const negotiating = computeHealthScore(active({ debts: [{ ...d, status: 'negotiating' }] }), week);
    expect(item(negotiating, 'agreed_payments').earned).toBe(6);
    const paid = computeHealthScore(
      active({
        debts: [d],
        debtPayments: [
          {
            id: 'p',
            debtId: d.id,
            amount: 100,
            paymentDate: '2026-10-13',
            interestAmount: null,
            feesAmount: null,
            transactionId: null,
            createdAt: '2026-10-13T00:00:00Z',
          },
        ],
      }),
      week
    );
    expect(item(paid, 'agreed_payments').earned).toBe(6);
  });

  it('pocos movimientos no dan puntaje alto', () => {
    const h = computeHealthScore(active(), week);
    expect(h.score!).toBeLessThan(50);
  });

  it('no castiga no poder ahorrar cuando el historial muestra déficit', () => {
    const deficit = active({
      transactions: [
        ...active().transactions,
        tx({ type: 'income', amount: 100, date: '2026-08-05' }),
        tx({ amount: 500, date: '2026-08-06' }),
        tx({ type: 'income', amount: 100, date: '2026-09-05' }),
        tx({ amount: 500, date: '2026-09-06' }),
      ],
    });
    expect(item(computeHealthScore(deficit, week), 'contribution').applicable).toBe(false);
    expect(item(computeHealthScore(active(), week), 'contribution').applicable).toBe(true);
  });

  it('acciones positivas suben el puntaje aunque no haya más dinero', () => {
    const before = computeHealthScore(active(), week).score!;
    const after = computeHealthScore(
      active({
        checkins: [
          { actionKey: 'weekly_review', periodStart: '2026-10-12', completedAt: '2026-10-14T10:00:00Z' },
          { actionKey: 'obligations_review', periodStart: '2026-10-12', completedAt: '2026-10-14T10:00:00Z' },
          { actionKey: 'debts_inventory', periodStart: '2026-10-01', completedAt: '2026-10-14T10:00:00Z' },
        ],
        lessons: [{ lessonId: 'x', quizPassed: true, completedAt: '2026-10-14T10:00:00Z' }],
      }),
      week
    ).score!;
    expect(after).toBeGreaterThan(before + 10);
  });

  it('calcula periodos pasados solo con lo que existía entonces', () => {
    const s = active({ lessons: [{ lessonId: 'x', quizPassed: true, completedAt: '2026-10-14T10:00:00Z' }] });
    const lastWeek = periodFor('week', '2026-10-08');
    expect(item(computeHealthScore(s, lastWeek), 'lessons_total').earned).toBe(0);
  });

  it('puntaje mensual también disponible', () => {
    const h = computeHealthScore(active(), periodFor('month', TODAY));
    expect(h.period).toEqual({ type: 'month', start: '2026-10-01', end: '2026-10-31' });
    expect(h.score).not.toBeNull();
  });
});
