/**
 * Mi progreso: experiencia (XP), niveles, rachas, retos y logros.
 *
 * Reglas de diseño:
 *  - El XP es un contador de hábitos. No es dinero, no se convierte en saldo
 *    y no tiene relación con cuentas ni transacciones.
 *  - Los retos se evalúan con datos reales y deterministas; cada uno se
 *    cobra una sola vez por semana (clave única en xp_events).
 *  - Nunca se premia endeudarse, gastar ni registrar más deudas: "Registrar
 *    un pago" solo aparece si hay una cuota acordada esa semana, y el ahorro
 *    solo se propone si el historial muestra capacidad.
 *  - Una racha rota no borra nada: el XP y la mejor racha se conservan.
 */
import { addDaysIso, isBetween, monthStart, weekEnd, weekStart, type IsoDate } from '@/shared/lib/dates';
import { monthlyCapacity } from './cashflow';
import { agreedDate, isBalanceConfirmed, isOpenDebt } from './debts';
import type { FinancialSnapshot } from './snapshot';

// ---------------------------------------------------------------------------
// Niveles

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
const LEVEL_NAMES = [
  'Explorador',
  'Observador',
  'Organizador',
  'Planificador',
  'Constructor',
  'Estratega',
  'Constante',
  'Sólido',
  'Referente',
  'Maestro',
];

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  /** 0–100 dentro del nivel actual. */
  progress: number;
}

export function thresholdFor(level: number): number {
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 0;
  return LEVEL_THRESHOLDS[level - 1] ?? last + (level - LEVEL_THRESHOLDS.length) * 800;
}

export function levelFor(xp: number): LevelInfo {
  let level = 1;
  while (xp >= thresholdFor(level + 1)) level++;
  const current = thresholdFor(level);
  const next = thresholdFor(level + 1);
  return {
    level,
    name: LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1] ?? 'Maestro',
    xp,
    currentLevelXp: current,
    nextLevelXp: next,
    progress: Math.round(((xp - current) / (next - current)) * 100),
  };
}

export function totalXp(snapshot: Pick<FinancialSnapshot, 'xpEvents'>): number {
  return snapshot.xpEvents.reduce((s, e) => s + e.points, 0);
}

// ---------------------------------------------------------------------------
// Rachas semanales de registro

export interface Streak {
  current: number;
  best: number;
  /** Ya hay actividad esta semana. */
  activeThisWeek: boolean;
}

/**
 * Semana activa = al menos un movimiento registrado (por fecha de creación)
 * o una revisión semanal. La semana en curso no rompe la racha hasta que
 * termina: si aún no registraste, la racha sigue viva desde la semana pasada.
 */
export function computeStreak(snapshot: FinancialSnapshot): Streak {
  const activeWeeks = new Set<string>([
    ...snapshot.transactions.map((t) => weekStart(t.createdAt.slice(0, 10))),
    ...snapshot.checkins
      .filter((c) => c.actionKey === 'weekly_review')
      .map((c) => weekStart(c.completedAt.slice(0, 10))),
  ]);
  const thisWeek = weekStart(snapshot.today);
  const activeThisWeek = activeWeeks.has(thisWeek);

  let current = 0;
  let cursor = activeThisWeek ? thisWeek : addDaysIso(thisWeek, -7);
  while (activeWeeks.has(cursor)) {
    current++;
    cursor = addDaysIso(cursor, -7);
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const week of [...activeWeeks].sort()) {
    run = prev !== null && addDaysIso(prev, 7) === week ? run + 1 : 1;
    best = Math.max(best, run);
    prev = week;
  }
  return { current, best: Math.max(best, current), activeThisWeek };
}

// ---------------------------------------------------------------------------
// Retos semanales

export interface Challenge {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  progressLabel: string;
  href: string;
  /** Clave única para xp_events (un cobro por semana). */
  xpKey: string;
}

interface ChallengeDef {
  id: string;
  title: string;
  description: string;
  xp: number;
  href: string;
  /** Si el reto tiene sentido para el usuario esta semana. */
  eligible: (ctx: ChallengeContext) => boolean;
  evaluate: (ctx: ChallengeContext) => { completed: boolean; progressLabel: string };
}

interface ChallengeContext {
  snapshot: FinancialSnapshot;
  from: IsoDate;
  to: IsoDate;
  level: number;
}

const inWeek = (ctx: ChallengeContext, date: string) => isBetween(date.slice(0, 10), ctx.from, ctx.to);

/** Deudas propias con fecha acordada en la semana, o con pagos en ella (ya pagadas esta semana). */
const dueThisWeek = (ctx: ChallengeContext) =>
  ctx.snapshot.debts.filter((d) => {
    if (d.direction !== 'i_owe') return false;
    const date = agreedDate(d);
    const datedThisWeek = isOpenDebt(d) && date !== null && isBetween(date, ctx.from, ctx.to);
    return (
      datedThisWeek || ctx.snapshot.debtPayments.some((p) => p.debtId === d.id && inWeek(ctx, p.paymentDate))
    );
  });

const CHALLENGES: ChallengeDef[] = [
  {
    id: 'log-days',
    title: 'Registra tus gastos de la semana',
    description: 'Registra movimientos en varios días distintos de esta semana.',
    xp: 20,
    href: '/transactions',
    eligible: () => true,
    evaluate: (ctx) => {
      const target = ctx.level >= 3 ? 5 : 3;
      const days = new Set(
        ctx.snapshot.transactions.filter((t) => inWeek(ctx, t.createdAt)).map((t) => t.createdAt.slice(0, 10))
      ).size;
      return { completed: days >= target, progressLabel: `${Math.min(days, target)}/${target} días` };
    },
  },
  {
    id: 'reconcile',
    title: 'Concilia una cuenta',
    description: 'Compara el saldo de una cuenta con tu banco o billetera y regístralo.',
    xp: 25,
    href: '/accounts',
    eligible: (ctx) => ctx.snapshot.accounts.length > 0,
    evaluate: (ctx) => {
      const done = ctx.snapshot.reconciliations.some((r) => inWeek(ctx, r.date));
      return { completed: done, progressLabel: done ? 'Hecho' : 'Pendiente' };
    },
  },
  {
    id: 'confirm-debt',
    title: 'Confirma el saldo de una deuda',
    description: 'Pide el saldo actualizado a un acreedor y regístralo como confirmado.',
    xp: 30,
    href: '/debts',
    eligible: (ctx) =>
      ctx.snapshot.debts.some(
        (d) => d.direction === 'i_owe' && isOpenDebt(d) && !isBalanceConfirmed(d, ctx.from)
      ),
    evaluate: (ctx) => {
      const done = ctx.snapshot.debts.some(
        (d) => d.balanceConfirmedAt !== null && inWeek(ctx, d.balanceConfirmedAt)
      );
      return { completed: done, progressLabel: done ? 'Hecho' : 'Pendiente' };
    },
  },
  {
    id: 'review-obligations',
    title: 'Revisa tus próximos pagos',
    description: 'Mira qué vence en las próximas semanas y marca la revisión.',
    xp: 15,
    href: '/plan',
    eligible: () => true,
    evaluate: (ctx) => {
      const done = ctx.snapshot.checkins.some(
        (c) => c.actionKey === 'obligations_review' && inWeek(ctx, c.completedAt)
      );
      return { completed: done, progressLabel: done ? 'Hecho' : 'Pendiente' };
    },
  },
  {
    id: 'review-subscription',
    title: 'Revisa una suscripción',
    description: '¿La sigues usando? Márcala como revisada o pausa la que no necesites.',
    xp: 15,
    href: '/subscriptions',
    eligible: (ctx) => ctx.snapshot.recurring.some((r) => r.status === 'active' && r.kind === 'subscription'),
    evaluate: (ctx) => {
      const done = ctx.snapshot.recurring.some(
        (r) => r.lastReviewedAt !== null && inWeek(ctx, r.lastReviewedAt)
      );
      return { completed: done, progressLabel: done ? 'Hecho' : 'Pendiente' };
    },
  },
  {
    id: 'lesson',
    title: 'Completa una lección',
    description: 'Termina una lección de la Academia respondiendo su pregunta.',
    xp: 20,
    href: '/academy',
    eligible: () => true,
    evaluate: (ctx) => {
      const done = ctx.snapshot.lessons.some((l) => l.completedAt !== null && inWeek(ctx, l.completedAt));
      return { completed: done, progressLabel: done ? 'Hecho' : 'Pendiente' };
    },
  },
  {
    id: 'agreed-payment',
    title: 'Registra el pago acordado',
    description:
      'Tienes una cuota con fecha esta semana. Registra el pago o, si no puedes, márcala en negociación.',
    xp: 20,
    href: '/debts',
    eligible: (ctx) => dueThisWeek(ctx).length > 0,
    evaluate: (ctx) => {
      const due = dueThisWeek(ctx);
      const attended = due.filter(
        (d) =>
          d.status === 'negotiating' ||
          d.status === 'agreement' ||
          ctx.snapshot.debtPayments.some((p) => p.debtId === d.id && inWeek(ctx, p.paymentDate))
      ).length;
      return {
        completed: due.length > 0 && attended === due.length,
        progressLabel: `${attended}/${due.length}`,
      };
    },
  },
  {
    id: 'save',
    title: 'Aporta a una meta',
    description: 'Aparta el monto que tú elijas para una de tus metas.',
    xp: 20,
    href: '/savings',
    // Solo si el historial muestra capacidad de ahorro: nunca se pide ahorrar en déficit.
    eligible: (ctx) =>
      ctx.snapshot.goals.some((g) => g.status === 'active') &&
      monthlyCapacity(ctx.snapshot, ctx.snapshot.defaultCurrency).status === 'surplus',
    evaluate: (ctx) => {
      const done = ctx.snapshot.contributions.some((c) => c.kind === 'deposit' && inWeek(ctx, c.date));
      return { completed: done, progressLabel: done ? 'Hecho' : 'Pendiente' };
    },
  },
  {
    id: 'budget',
    title: 'Prepara el presupuesto del mes',
    description: 'Crea o ajusta al menos un presupuesto mensual por categoría.',
    xp: 25,
    href: '/budgets',
    eligible: (ctx) => ctx.snapshot.budgets.length === 0 || ctx.from <= addDaysIso(monthStart(ctx.from), 7),
    evaluate: (ctx) => {
      const done = ctx.snapshot.budgets.some((b) => inWeek(ctx, b.createdAt));
      return { completed: done, progressLabel: done ? 'Hecho' : 'Pendiente' };
    },
  },
];

export const MAX_ACTIVE_CHALLENGES = 4;

/** Retos de la semana de `date`: hasta 4 que apliquen al usuario, en orden fijo. */
export function weeklyChallenges(snapshot: FinancialSnapshot, date: IsoDate = snapshot.today): Challenge[] {
  const from = weekStart(date);
  const ctx: ChallengeContext = {
    snapshot,
    from,
    to: weekEnd(date),
    level: levelFor(totalXp(snapshot)).level,
  };
  return CHALLENGES.filter((c) => c.eligible(ctx))
    .slice(0, MAX_ACTIVE_CHALLENGES)
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      xp: c.xp,
      href: c.href,
      xpKey: `${c.id}:${from}`,
      ...c.evaluate(ctx),
    }));
}

// ---------------------------------------------------------------------------
// Logros (una sola vez)

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
}

const ACHIEVEMENTS: {
  id: string;
  title: string;
  description: string;
  xp: number;
  test: (s: FinancialSnapshot) => boolean;
}[] = [
  {
    id: 'first-account',
    title: 'Primer paso',
    description: 'Registraste tu primera cuenta.',
    xp: 20,
    test: (s) => s.accounts.length > 0,
  },
  {
    id: 'first-reconciliation',
    title: 'Cuentas claras',
    description: 'Conciliaste una cuenta por primera vez.',
    xp: 30,
    test: (s) => s.reconciliations.length > 0,
  },
  {
    id: 'debts-inventory',
    title: 'Mapa completo',
    description: 'Confirmaste el inventario de tus deudas.',
    xp: 40,
    test: (s) => s.checkins.some((c) => c.actionKey === 'debts_inventory'),
  },
  {
    id: 'first-confirmed-debt',
    title: 'Saldo real',
    description: 'Confirmaste el saldo de una deuda con el acreedor.',
    xp: 30,
    test: (s) => s.debts.some((d) => d.balanceConfirmedAt !== null),
  },
  {
    id: 'first-budget',
    title: 'Plan en marcha',
    description: 'Creaste tu primer presupuesto.',
    xp: 30,
    test: (s) => s.budgets.length > 0,
  },
  {
    id: 'emergency-fund',
    title: 'Colchón',
    description: 'Creaste tu meta de fondo de emergencia.',
    xp: 30,
    test: (s) => s.goals.some((g) => g.isEmergencyFund),
  },
  {
    id: 'goal-completed',
    title: 'Meta cumplida',
    description: 'Completaste una meta de ahorro.',
    xp: 60,
    test: (s) =>
      s.goals.some(
        (g) =>
          g.status === 'completed' ||
          (g.targetAmount !== null && g.targetAmount > 0 && g.currentAmount >= g.targetAmount)
      ),
  },
  {
    id: 'debt-paid',
    title: 'Deuda saldada',
    description: 'Terminaste de pagar una deuda.',
    xp: 60,
    test: (s) => s.debts.some((d) => d.direction === 'i_owe' && d.status === 'paid' && d.totalPaid > 0),
  },
  {
    id: 'monthly-close',
    title: 'Mes cerrado',
    description: 'Hiciste tu primer cierre mensual.',
    xp: 30,
    test: (s) => s.checkins.some((c) => c.actionKey === 'monthly_close'),
  },
  {
    id: 'streak-4',
    title: 'Constancia',
    description: 'Cuatro semanas seguidas registrando.',
    xp: 50,
    test: (s) => computeStreak(s).best >= 4,
  },
  {
    id: 'lessons-3',
    title: 'Aprendiz',
    description: 'Completaste 3 lecciones.',
    xp: 30,
    test: (s) => s.lessons.filter((l) => l.completedAt).length >= 3,
  },
  {
    id: 'lessons-10',
    title: 'Estudiante constante',
    description: 'Completaste 10 lecciones.',
    xp: 60,
    test: (s) => s.lessons.filter((l) => l.completedAt).length >= 10,
  },
];

export function evaluateAchievements(snapshot: FinancialSnapshot): Achievement[] {
  return ACHIEVEMENTS.map(({ test, ...a }) => ({ ...a, unlocked: test(snapshot) }));
}

// ---------------------------------------------------------------------------
// XP pendiente de registrar (retos completados y logros desbloqueados aún sin cobrar)

export interface PendingXp {
  sourceType: 'challenge' | 'achievement';
  sourceKey: string;
  points: number;
  description: string;
}

export function pendingXp(snapshot: FinancialSnapshot): PendingXp[] {
  const have = new Set(snapshot.xpEvents.map((e) => `${e.sourceType}|${e.sourceKey}`));
  const pending: PendingXp[] = [];
  for (const c of weeklyChallenges(snapshot)) {
    if (c.completed && !have.has(`challenge|${c.xpKey}`)) {
      pending.push({
        sourceType: 'challenge',
        sourceKey: c.xpKey,
        points: c.xp,
        description: `Reto: ${c.title}`,
      });
    }
  }
  for (const a of evaluateAchievements(snapshot)) {
    if (a.unlocked && !have.has(`achievement|${a.id}`)) {
      pending.push({
        sourceType: 'achievement',
        sourceKey: a.id,
        points: a.xp,
        description: `Logro: ${a.title}`,
      });
    }
  }
  return pending;
}

/** XP ganado por mes (últimos `months` meses, incluido el actual). */
export function xpByMonth(snapshot: FinancialSnapshot, months = 6): { month: IsoDate; xp: number }[] {
  const result: { month: IsoDate; xp: number }[] = [];
  let cursor = monthStart(snapshot.today);
  for (let i = 0; i < months; i++) {
    const m = cursor;
    result.unshift({
      month: m,
      xp: snapshot.xpEvents
        .filter((e) => monthStart(e.earnedAt.slice(0, 10)) === m)
        .reduce((s, e) => s + e.points, 0),
    });
    cursor = monthStart(addDaysIso(cursor, -1));
  }
  return result;
}

/** Mensaje semanal: positivo, concreto, sin culpa. */
export function weeklyMessage(snapshot: FinancialSnapshot): string {
  const challenges = weeklyChallenges(snapshot);
  const done = challenges.filter((c) => c.completed);
  const next = challenges.find((c) => !c.completed);
  if (done.length === 0) {
    return next
      ? `Esta semana es una buena oportunidad para empezar. Un paso sencillo: ${next.title.toLowerCase()}.`
      : 'Cada registro te da más claridad sobre tu dinero.';
  }
  const first = done[0]!.title.toLowerCase();
  return next
    ? `Esta semana completaste "${first}" y ahora tienes más claridad sobre tu dinero. El siguiente paso es: ${next.title.toLowerCase()}.`
    : `Completaste todos los retos de la semana. Buen trabajo sosteniendo el hábito.`;
}
