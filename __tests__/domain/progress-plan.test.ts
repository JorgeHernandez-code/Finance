import { describe, expect, it } from 'vitest';
import {
  computeStreak,
  evaluateAchievements,
  levelFor,
  pendingXp,
  weeklyChallenges,
  weeklyMessage,
} from '@/domain/finance/progress';
import { buildPlan } from '@/domain/finance/plan';
import { nextActions } from '@/domain/finance/actions';
import { account, debt, goal, recurring, snap, tx } from './fixtures';

describe('niveles y XP', () => {
  it('umbrales de nivel', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(3200).level).toBe(10);
    expect(levelFor(4000).level).toBe(11);
    expect(levelFor(175).progress).toBe(50);
  });
});

describe('rachas', () => {
  it('la semana en curso no rompe la racha hasta que termina', () => {
    const s = snap({ transactions: [tx({ date: '2026-10-01' }), tx({ date: '2026-10-08' })] });
    expect(computeStreak(s)).toEqual({ current: 2, best: 2, activeThisWeek: false });
  });

  it('una racha rota empieza de nuevo y conserva la mejor', () => {
    const s = snap({
      transactions: [
        tx({ date: '2026-09-01' }),
        tx({ date: '2026-09-08' }),
        tx({ date: '2026-09-15' }),
        tx({ date: '2026-10-13' }),
      ],
    });
    expect(computeStreak(s)).toEqual({ current: 1, best: 3, activeThisWeek: true });
  });
});

describe('retos', () => {
  it('se adaptan: sin deudas no hay reto de confirmar deuda; sin capacidad no se pide ahorrar', () => {
    const ids = weeklyChallenges(snap({ accounts: [account()], goals: [goal()] })).map((c) => c.id);
    expect(ids).not.toContain('confirm-debt');
    expect(ids).not.toContain('save');
  });

  it('máximo 4 retos y claves únicas por semana', () => {
    const cs = weeklyChallenges(snap({ accounts: [account()], debts: [debt()] }));
    expect(cs.length).toBeLessThanOrEqual(4);
    expect(cs[0]!.xpKey).toBe('log-days:2026-10-12');
  });

  it('el reto de pago solo aparece con una cuota acordada esa semana', () => {
    expect(weeklyChallenges(snap({ debts: [debt()] })).some((c) => c.id === 'agreed-payment')).toBe(false);
  });

  it('no vuelve a dar XP por un reto ya cobrado', () => {
    const base = snap({
      transactions: [tx({ date: '2026-10-12' }), tx({ date: '2026-10-13' }), tx({ date: '2026-10-14' })],
    });
    expect(pendingXp(base).some((p) => p.sourceKey === 'log-days:2026-10-12')).toBe(true);
    const claimed = {
      ...base,
      xpEvents: [
        {
          sourceType: 'challenge' as const,
          sourceKey: 'log-days:2026-10-12',
          points: 20,
          description: '',
          earnedAt: '2026-10-14T00:00:00Z',
        },
      ],
    };
    expect(pendingXp(claimed).some((p) => p.sourceKey === 'log-days:2026-10-12')).toBe(false);
  });

  it('ningún logro premia endeudarse', () => {
    const many = evaluateAchievements(snap({ debts: [debt(), debt(), debt()] }));
    expect(many.filter((a) => a.unlocked)).toEqual([]);
  });

  it('mensaje semanal positivo, sin culpa', () => {
    const msg = weeklyMessage(snap());
    expect(msg).not.toMatch(/fracas|malo|desastre/i);
  });
});

describe('plan financiero', () => {
  it('sin datos: etapa 1, sin inventar capacidad', () => {
    const plan = buildPlan(snap());
    expect(plan.currentStage).toBe(1);
    expect(plan.capacity.status).toBe('unknown');
    expect(plan.deficitWarning).toBeNull();
  });

  it('muestra claramente el déficit cuando lo esencial supera los ingresos', () => {
    const s = snap({
      recurring: [recurring({ kind: 'rent', isEssential: true, amount: 2000 })],
      transactions: [
        tx({ type: 'income', amount: 1000, date: '2026-08-05' }),
        tx({ type: 'income', amount: 1000, date: '2026-09-05' }),
      ],
    });
    const plan = buildPlan(s);
    expect(plan.capacity.status).toBe('deficit');
    expect(plan.deficitWarning).toMatch(/superan tus ingresos/);
  });

  it('crecimiento: no se habilita sin fondo, excedente y perfil de riesgo', () => {
    const stage6 = buildPlan(snap()).stages[5]!;
    expect(stage6.complete).toBe(false);
  });
});

describe('próximas acciones', () => {
  it('sin datos no hay recomendaciones inventadas', () => {
    expect(nextActions(snap())).toEqual([]);
  });

  it('prioriza pagos próximos y confirma saldos', () => {
    const actions = nextActions(
      snap({ debts: [debt({ creditorName: 'Banco', nextPaymentDate: '2026-10-18' })] })
    );
    expect(actions[0]!.title).toBe('Preparar el pago a Banco');
    expect(actions.some((a) => a.title === 'Confirmar el saldo de Banco')).toBe(true);
  });
});
