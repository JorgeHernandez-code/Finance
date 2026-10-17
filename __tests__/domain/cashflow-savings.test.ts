import { describe, expect, it } from 'vitest';
import {
  monthlyCapacity,
  monthlyCommitments,
  monthlyEquivalent,
  projectBudget,
  summarizeMonth,
} from '@/domain/finance/cashflow';
import { goalMetrics, runScenario } from '@/domain/finance/savings';
import { debt, goal, recurring, snap, tx, TODAY } from './fixtures';

describe('resumen mensual', () => {
  it('clasifica gastos y no cuenta transferencias como gasto', () => {
    const rent = recurring({ kind: 'rent', isEssential: true });
    const netflix = recurring({ kind: 'subscription' });
    const payTx = tx({ amount: 300 });
    const s = snap({
      recurring: [rent, netflix],
      debtPayments: [
        {
          id: 'p1',
          debtId: 'd1',
          amount: 300,
          paymentDate: TODAY,
          interestAmount: null,
          feesAmount: null,
          transactionId: payTx.id,
          createdAt: `${TODAY}T00:00:00Z`,
        },
      ],
      transactions: [
        tx({ type: 'income', amount: 5000 }),
        tx({ amount: 1000, subscriptionId: rent.id }),
        tx({ amount: 50, subscriptionId: netflix.id }),
        tx({ amount: 200 }),
        payTx,
        tx({ type: 'transfer', transferDirection: 'out', amount: 999 }),
        tx({ type: 'transfer', transferDirection: 'in', amount: 999 }),
        tx({ amount: 77, date: '2026-09-30' }),
      ],
    });
    const m = summarizeMonth(s, TODAY);
    expect(m.income).toEqual({ COP: 5000 });
    expect(m.expense).toEqual({ COP: 1550 });
    expect(m.fixed).toEqual({ COP: 1000 });
    expect(m.subscriptions).toEqual({ COP: 50 });
    expect(m.debtPayments).toEqual({ COP: 300 });
    expect(m.variable).toEqual({ COP: 200 });
    expect(m.realSaving).toEqual({ COP: 3450 });
    expect(m.balanceChange).toEqual({ COP: 3450 });
  });

  it('equivalente mensual de frecuencias', () => {
    expect(monthlyEquivalent({ amount: 120, billingCycle: 'yearly' })).toBe(10);
    expect(monthlyEquivalent({ amount: 100, billingCycle: 'weekly' })).toBe(433.33);
  });

  it('una cuota enlazada a un recurrente no se cuenta dos veces', () => {
    const loan = debt({ installmentAmount: 500, remainingBalance: 5000 });
    const other = debt({ installmentAmount: 200, remainingBalance: 1000 });
    const s = snap({
      debts: [loan, other],
      recurring: [recurring({ kind: 'loan_installment', amount: 500, debtId: loan.id })],
    });
    const c = monthlyCommitments(s);
    expect(c.debtInstallmentsNotRecurring).toEqual({ COP: 200 });
    expect(c.totalMonthly).toEqual({ COP: 700 });
  });

  it('sin 2 meses de historial la capacidad es desconocida (no se inventa)', () => {
    const s = snap({ transactions: [tx({ type: 'income', amount: 1000, date: '2026-09-10' })] });
    expect(monthlyCapacity(s, 'COP').status).toBe('unknown');
  });

  it('muestra déficit si lo esencial y las cuotas superan los ingresos', () => {
    const s = snap({
      transactions: [
        tx({ type: 'income', amount: 1000, date: '2026-08-05' }),
        tx({ amount: 900, date: '2026-08-06' }),
        tx({ type: 'income', amount: 1000, date: '2026-09-05' }),
        tx({ amount: 900, date: '2026-09-06' }),
      ],
      debts: [debt({ installmentAmount: 300, remainingBalance: 3000 })],
    });
    const c = monthlyCapacity(s, 'COP');
    expect(c.monthlySurplus).toBe(-200);
    expect(c.status).toBe('deficit');
  });
});

describe('proyección de presupuesto', () => {
  const b = { spent: 300, periodStart: '2026-10-01', periodEnd: '2026-10-31' };
  it('no proyecta sin historial ni al inicio del mes', () => {
    expect(projectBudget(b, TODAY, 0).projected).toBeNull();
    expect(projectBudget(b, '2026-10-05', 3).projected).toBeNull();
  });
  it('proyecta linealmente con datos suficientes', () => {
    expect(projectBudget(b, TODAY, 2).projected).toBe(620);
  });
});

describe('metas de ahorro', () => {
  it('calcula pendiente, porcentaje, meses y aporte necesario', () => {
    const g = goal({
      targetAmount: 1200,
      currentAmount: 200,
      targetDate: '2027-04-15',
      createdAt: '2026-04-15T00:00:00Z',
    });
    const m = goalMetrics(g, snap());
    expect(m.remaining).toBe(1000);
    expect(m.percent).toBeCloseTo(16.7);
    expect(m.monthsRemaining).toBe(6);
    expect(m.requiredMonthly).toBe(166.67);
    expect(m.status).toBe('behind');
  });

  it('estima la fecha con el ritmo real de aportes', () => {
    const g = goal({ targetAmount: 1000, currentAmount: 400, createdAt: '2026-06-01T00:00:00Z' });
    const s = snap({
      contributions: [
        { goalId: g.id, amount: 300, kind: 'deposit', date: '2026-08-20', createdAt: '2026-08-20T00:00:00Z' },
        { goalId: g.id, amount: 300, kind: 'deposit', date: '2026-09-20', createdAt: '2026-09-20T00:00:00Z' },
      ],
    });
    const m = goalMetrics(g, s);
    expect(m.actualMonthlyPace).toBe(200);
    expect(m.estimateBasis).toBe('actual_pace');
    expect(m.estimatedCompletion).toBe('2027-01-15');
  });

  it('escenario sin capacidad: no propone aportes y lo explica', () => {
    const r = runScenario([goal({ targetDate: '2027-01-01' })], snap(), 'COP', {
      kind: 'conservative',
      monthlyAmount: -50,
    });
    expect(r.allocations.every((a) => a.monthly === 0)).toBe(true);
    expect(r.message).toMatch(/no queda dinero/);
  });

  it('escenario sin datos: no inventa capacidad', () => {
    expect(
      runScenario([goal()], snap(), 'COP', { kind: 'conservative', monthlyAmount: null }).allocations
    ).toEqual([]);
  });

  it('reparte por prioridad y propone fecha alternativa si no alcanza', () => {
    const a = goal({ name: 'A', priority: 1, targetAmount: 600, targetDate: '2027-04-15' });
    const b = goal({ name: 'B', priority: 2, targetAmount: 600, targetDate: '2027-04-15' });
    const r = runScenario([b, a], snap(), 'COP', { kind: 'base', monthlyAmount: 150 });
    expect(r.allocations.map((x) => x.name)).toEqual(['A', 'B']);
    expect(r.allocations[0]!.monthly).toBe(100);
    expect(r.allocations[1]!.monthly).toBe(50);
    expect(r.allocations[1]!.meetsTargetDate).toBe(false);
    expect(r.allocations[1]!.alternativeDate).toBe('2027-10-15');
  });

  it('las metas pausadas o canceladas no reciben aportes', () => {
    const r = runScenario([goal({ status: 'paused' }), goal({ status: 'cancelled' })], snap(), 'COP', {
      kind: 'base',
      monthlyAmount: 100,
    });
    expect(r.allocations).toEqual([]);
  });
});
