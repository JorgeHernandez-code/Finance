import { describe, expect, it } from 'vitest';
import { LESSONS, checkLessonCompletion, isLevelUnlocked, nextLesson } from '@/domain/academy/lessons';

describe('Academia', () => {
  it('cada lección tiene todas sus partes y una respuesta válida', () => {
    const ids = new Set<string>();
    for (const l of LESSONS) {
      expect(ids.has(l.id)).toBe(false);
      ids.add(l.id);
      expect(l.id).toMatch(/^[a-z0-9-]{2,80}$/); // coincide con el CHECK de lesson_progress
      expect(l.explanation.length).toBeGreaterThan(0);
      expect(l.example).toBeTruthy();
      expect(l.exercise.prompt).toBeTruthy();
      expect(l.quiz.options[l.quiz.correctIndex]).toBeDefined();
      expect(l.xp).toBeGreaterThan(0);
      expect(l.xp).toBeLessThanOrEqual(500); // CHECK de xp_events
    }
    for (const level of [1, 2, 3, 4, 5])
      expect(LESSONS.filter((l) => l.level === level).length).toBeGreaterThanOrEqual(3);
  });

  it('abrir o responder sin ejercicio no completa la lección', () => {
    const l = LESSONS[0]!;
    expect(checkLessonCompletion(l, l.quiz.correctIndex, '').passed).toBe(false);
    expect(
      checkLessonCompletion(l, (l.quiz.correctIndex + 1) % l.quiz.options.length, 'mi respuesta al ejercicio')
        .passed
    ).toBe(false);
    expect(checkLessonCompletion(l, l.quiz.correctIndex, 'mi respuesta al ejercicio').passed).toBe(true);
  });

  it('progresión por niveles', () => {
    expect(isLevelUnlocked(2, new Set())).toBe(false);
    const level1 = LESSONS.filter((l) => l.level === 1).map((l) => l.id);
    expect(isLevelUnlocked(2, new Set(level1.slice(0, 2)))).toBe(true);
    expect(nextLesson(new Set())?.level).toBe(1);
    expect(nextLesson(new Set(LESSONS.map((l) => l.id)))).toBeNull();
  });

  it('la aplicación personal no inventa datos cuando no los hay', () => {
    const ctx = {
      accountsCount: 0,
      unreconciledAccounts: 0,
      openDebtsCount: 0,
      unconfirmedDebts: 0,
      debtsWithUnknownInterest: 0,
      debtCurrencies: [],
      hasMonthlyBudget: false,
      essentialRecurringCount: 0,
      subscriptionsCount: 0,
      subscriptionsMonthly: 0,
      capacityStatus: 'unknown' as const,
      hasEmergencyFund: false,
      emergencyFundMonths: null,
      goalsCount: 0,
      netWorthIntegrity: 0,
      monthsOfHistory: 0,
      defaultCurrency: 'COP',
    };
    for (const l of LESSONS) expect(l.applyToMe(ctx)).not.toMatch(/undefined|NaN|null/);
  });
});
