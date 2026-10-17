import { describe, expect, it } from 'vitest';
import { computeAvailability } from '@/domain/finance/availability';
import { computeNetWorth } from '@/domain/finance/netWorth';
import { account, debt, goal, snap } from './fixtures';

describe('dinero disponible', () => {
  it('separa por moneda, distingue confirmado y descuenta reservas sin contarlas dos veces', () => {
    const cop = account({ currency: 'COP', currentBalance: 1_000_000, lastReconciledOn: '2026-10-10' });
    const clp = account({ currency: 'CLP', currentBalance: 200_000 });
    const s = snap({
      accounts: [cop, clp],
      goals: [
        goal({ currentAmount: 300_000, accountId: cop.id }),
        goal({ currentAmount: 50_000, status: 'cancelled', accountId: cop.id }),
      ],
      rates: [{ base: 'CLP', quote: 'COP', rate: 4, date: '2026-10-14' }],
    });
    const a = computeAvailability(s);
    const copRow = a.byCurrency.find((c) => c.currency === 'COP')!;
    expect(copRow.total).toBe(1_000_000);
    expect(copRow.confirmed).toBe(1_000_000);
    expect(copRow.reserved).toBe(300_000); // la meta cancelada ya no reserva
    expect(copRow.free).toBe(700_000);
    const clpRow = a.byCurrency.find((c) => c.currency === 'CLP')!;
    expect(clpRow.pendingConfirmation).toBe(200_000);
    expect(a.totalCop.total).toBe(1_800_000);
  });

  it('una reserva sin cuenta se descuenta de su moneda', () => {
    const a = computeAvailability(
      snap({ accounts: [account({ currentBalance: 500 })], goals: [goal({ currentAmount: 600 })] })
    );
    expect(a.byCurrency[0]!.free).toBe(-100);
  });

  it('no consolida en COP si falta la tasa', () => {
    const a = computeAvailability(snap({ accounts: [account({ currency: 'CLP', currentBalance: 100 })] }));
    expect(a.totalCop.complete).toBe(false);
    expect(a.totalCop.total).toBe(0);
  });
});

describe('patrimonio neto', () => {
  it('activos − pasivos por moneda, sin sumar ahorro aparte', () => {
    const s = snap({
      accounts: [account({ currentBalance: 1_000 })],
      goals: [goal({ currentAmount: 400 })],
      debts: [debt({ remainingBalance: 300, installmentAmount: 100 })],
    });
    const nw = computeNetWorth(s);
    expect(nw.byCurrency).toEqual([
      { currency: 'COP', assets: 1_000, liabilities: 300, net: 700, confirmedNet: 0 },
    ]);
  });

  it('cuenta por cobrar como activo una sola vez; deudas pagadas no cuentan', () => {
    const s = snap({
      debts: [
        debt({ direction: 'owed_to_me', remainingBalance: 200 }),
        debt({ remainingBalance: 0, status: 'paid' }),
      ],
    });
    const nw = computeNetWorth(s);
    expect(nw.assets).toHaveLength(1);
    expect(nw.liabilities).toHaveLength(0);
    expect(nw.byCurrency[0]!.net).toBe(200);
  });

  it('una cuenta con saldo negativo es pasivo', () => {
    const nw = computeNetWorth(snap({ accounts: [account({ type: 'credit_card', currentBalance: -500 })] }));
    expect(nw.liabilities[0]!.kind).toBe('negative_account');
    expect(nw.byCurrency[0]!.net).toBe(-500);
  });

  it('integridad y advertencias reflejan datos estimados', () => {
    const s = snap({
      accounts: [account({ currentBalance: 900, lastReconciledOn: '2026-10-14' })],
      debts: [debt({ remainingBalance: 100 })],
    });
    const nw = computeNetWorth(s);
    expect(nw.integrity).toBe(90);
    expect(nw.warnings.some((w) => w.includes('saldo estimado'))).toBe(true);
  });

  it('no suma monedas distintas en el consolidado sin tasa', () => {
    const nw = computeNetWorth(
      snap({
        accounts: [account({ currentBalance: 100 }), account({ currency: 'CLP', currentBalance: 100 })],
      })
    );
    expect(nw.netCop.complete).toBe(false);
    expect(nw.netCop.total).toBe(100);
    expect(nw.warnings.some((w) => w.includes('CLP'))).toBe(true);
  });
});
