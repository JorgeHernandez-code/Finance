import { describe, expect, it } from 'vitest';
import { isOpenDebt, summarizeDebts, simulatePayoff } from '@/domain/finance/debts';
import { computeNetWorth } from '@/domain/finance/netWorth';
import { monthlyCommitments, monthlyEquivalent } from '@/domain/finance/cashflow';
import { goalMetrics, runScenario } from '@/domain/finance/savings';
import { debt, goal, recurring, snap } from './fixtures';

/** Datos que el usuario no conoce: nunca se convierten en 0 ni en cifras inventadas. */
describe('valores desconocidos', () => {
  it('una deuda con saldo desconocido sigue abierta (no se da por pagada)', () => {
    expect(isOpenDebt(debt({ principalAmount: null, remainingBalance: null }))).toBe(true);
  });

  it('el saldo desconocido no se suma a los totales y se cuenta aparte', () => {
    const s = snap({
      debts: [
        debt({ remainingBalance: 1000 }),
        debt({ principalAmount: null, remainingBalance: null, installmentAmount: 50 }),
      ],
    });
    const sum = summarizeDebts(s);
    expect(sum.iOwe.byCurrency).toEqual({ COP: 1000 });
    expect(sum.iOwe.unknownBalanceCount).toBe(1);
    expect(sum.incomplete.some((d) => d.gaps.includes('balance_unknown'))).toBe(true);
    // Su cuota sí cuenta como compromiso mensual conocido.
    expect(sum.monthlyInstallments).toEqual({ COP: 50 });
  });

  it('obligaciones a nombre de terceros se identifican en un subtotal', () => {
    const sum = summarizeDebts(
      snap({ debts: [debt({ remainingBalance: 300, responsibility: 'third_party', legalHolder: 'Otro' })] })
    );
    expect(sum.iOwe.sharedOrThirdPartyByCurrency).toEqual({ COP: 300 });
  });

  it('el patrimonio advierte las deudas sin saldo y marca las aproximadas', () => {
    const nw = computeNetWorth(
      snap({
        debts: [
          debt({ principalAmount: null, remainingBalance: null }),
          debt({ remainingBalance: 500, amountIsEstimate: true }),
        ],
      })
    );
    expect(nw.liabilities).toHaveLength(1);
    expect(nw.liabilities[0]!.certainty).toBe('estimated');
    expect(nw.warnings.some((w) => w.includes('saldo total desconocido'))).toBe(true);
  });

  it('la simulación excluye saldos desconocidos y lo advierte', () => {
    const r = simulatePayoff(
      [debt({ creditorName: 'X', remainingBalance: null, installmentAmount: 10 })],
      100,
      'avalanche'
    );
    expect(r.warnings.some((w) => w.includes('saldo desconocido'))).toBe(true);
  });

  it('un recurrente sin frecuencia no tiene equivalente mensual ni entra en totales', () => {
    expect(monthlyEquivalent({ amount: 6000, billingCycle: null })).toBeNull();
    const c = monthlyCommitments(
      snap({
        recurring: [
          recurring({ amount: 300000, kind: 'rent' }),
          recurring({ amount: 55000, amountIsEstimate: true }),
          recurring({ amount: 54000, cycleConfirmed: false }),
          recurring({ amount: 25000, billingCycle: 'bimonthly', amountIsEstimate: true }),
          recurring({ amount: 6000, billingCycle: null }),
        ],
      })
    );
    expect(c.confirmedRecurring).toEqual({ COP: 300000 });
    expect(c.estimatedRecurring).toEqual({ COP: 55000 + 54000 + 12500 });
    expect(c.unknownFrequency).toHaveLength(1);
  });

  it('una meta sin monto (pendiente de cotización) no se da por cumplida ni recibe asignación', () => {
    const g = goal({ targetAmount: null });
    expect(goalMetrics(g, snap()).status).toBe('no_target');
    expect(goalMetrics(g, snap()).remaining).toBeNull();
    expect(runScenario([g], snap(), 'COP', { kind: 'base', monthlyAmount: 100 }).allocations).toEqual([]);
  });
});
