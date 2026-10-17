/**
 * Próximas acciones y recordatorios internos. Todo sale de datos registrados:
 * si no hay datos, no hay recomendación. La app no paga, no mueve dinero,
 * no contacta acreedores ni envía mensajes: solo sugiere al usuario.
 */
import type { Route } from 'next';
import { addDaysIso, daysBetween, isBetween, weekStart, type IsoDate } from '@/shared/lib/dates';
import { isAccountConfirmed } from './availability';
import { agreedDate, isBalanceConfirmed, isOpenDebt } from './debts';
import { goalMetrics } from './savings';
import { isMonthCloseWindow } from './plan';
import type { FinancialSnapshot } from './snapshot';

export interface NextAction {
  key: string;
  title: string;
  reason: string;
  href: Route;
  /** Menor = más importante. */
  rank: number;
}

export function nextActions(s: FinancialSnapshot, limit = 5): NextAction[] {
  const today = s.today;
  const actions: NextAction[] = [];

  for (const d of s.debts.filter((x) => x.direction === 'i_owe' && isOpenDebt(x))) {
    const date = agreedDate(d);
    if (date && date >= today && daysBetween(today, date) <= 7) {
      actions.push({
        key: `prepare-${d.id}`,
        title: `Preparar el pago a ${d.creditorName}`,
        reason: `Fecha acordada en ${daysBetween(today, date)} día(s).`,
        href: '/debts',
        rank: 1,
      });
    } else if (
      date &&
      date < today &&
      d.status !== 'negotiating' &&
      d.status !== 'agreement' &&
      d.negotiable !== 'no'
    ) {
      actions.push({
        key: `negotiate-${d.id}`,
        title: `Contactar a ${d.creditorName}`,
        reason: 'La fecha acordada pasó. Si no puedes pagar ahora, negociar un acuerdo es un buen paso.',
        href: '/debts',
        rank: 2,
      });
    }
    if (!isBalanceConfirmed(d, today)) {
      actions.push({
        key: `confirm-${d.id}`,
        title: `Confirmar el saldo de ${d.creditorName}`,
        reason: 'El saldo actual es una estimación.',
        href: '/debts',
        rank: 4,
      });
    }
  }

  const thisWeek = weekStart(today);
  if (s.accounts.length > 0 && !s.transactions.some((t) => t.createdAt.slice(0, 10) >= thisWeek)) {
    actions.push({
      key: 'log-week',
      title: 'Registrar los gastos de la semana',
      reason: 'Aún no hay movimientos registrados esta semana.',
      href: '/transactions',
      rank: 3,
    });
  }

  const stale = s.accounts.filter((a) => !isAccountConfirmed(a, today));
  const firstStale = stale[0];
  if (firstStale) {
    actions.push({
      key: `reconcile-${firstStale.id}`,
      title: `Actualizar el saldo de ${firstStale.name}`,
      reason:
        stale.length > 1
          ? `${stale.length} cuentas sin conciliar en 35 días.`
          : 'Sin conciliar en los últimos 35 días.',
      href: '/accounts',
      rank: 5,
    });
  }

  const sub = s.recurring.find(
    (r) =>
      r.status === 'active' &&
      r.kind === 'subscription' &&
      (!r.lastReviewedAt || daysBetween(r.lastReviewedAt, today) > 90)
  );
  if (sub)
    actions.push({
      key: `sub-${sub.id}`,
      title: `Revisar la suscripción ${sub.name}`,
      reason: '¿La sigues usando lo suficiente?',
      href: '/subscriptions',
      rank: 7,
    });

  if (s.budgets.filter((b) => b.period === 'monthly').length === 0 && s.transactions.length > 0) {
    actions.push({
      key: 'budget',
      title: 'Preparar el presupuesto mensual',
      reason: 'Todavía no hay presupuestos por categoría.',
      href: '/budgets',
      rank: 6,
    });
  }

  for (const g of s.goals.filter((x) => x.status === 'active')) {
    if (goalMetrics(g, s).status === 'behind') {
      actions.push({
        key: `goal-${g.id}`,
        title: `Revisar el progreso de ${g.name}`,
        reason: 'Va por debajo del ritmo esperado. Puedes ajustar la fecha o el aporte.',
        href: '/savings',
        rank: 8,
      });
    }
  }

  if (
    isMonthCloseWindow(today) &&
    !s.checkins.some(
      (c) => c.actionKey === 'monthly_close' && daysBetween(c.completedAt.slice(0, 10), today) <= 10
    )
  ) {
    actions.push({
      key: 'monthly-close',
      title: 'Hacer el cierre del mes',
      reason: 'Revisa cómo terminó el mes antes de empezar el siguiente.',
      href: '/plan',
      rank: 6,
    });
  }

  return actions.sort((a, b) => a.rank - b.rank).slice(0, limit);
}

export interface Reminder {
  key: string;
  date: IsoDate | null;
  title: string;
  kind: 'debt' | 'subscription' | 'goal' | 'weekly_review' | 'monthly_close' | 'lesson' | 'reconciliation';
  href: Route;
}

/** Recordatorios internos de los próximos `days` días (se muestran en la app; no hay envío externo). */
export function upcomingReminders(
  s: FinancialSnapshot,
  days = 14,
  nextLessonTitle?: string | null
): Reminder[] {
  const today = s.today;
  const until = addDaysIso(today, days);
  const reminders: Reminder[] = [];

  for (const d of s.debts.filter((x) => x.direction === 'i_owe' && isOpenDebt(x))) {
    const date = agreedDate(d);
    if (date && isBetween(date, today, until))
      reminders.push({
        key: `debt-${d.id}`,
        date,
        title: `Pago a ${d.creditorName}`,
        kind: 'debt',
        href: '/debts',
      });
  }
  for (const r of s.recurring.filter((x) => x.status === 'active')) {
    if (isBetween(r.nextBillingDate, today, until))
      reminders.push({
        key: `sub-${r.id}`,
        date: r.nextBillingDate,
        title: r.name,
        kind: 'subscription',
        href: '/subscriptions',
      });
  }
  for (const g of s.goals.filter((x) => x.status === 'active' && x.targetDate)) {
    if (isBetween(g.targetDate!, today, addDaysIso(today, 30)))
      reminders.push({
        key: `goal-${g.id}`,
        date: g.targetDate,
        title: `Fecha objetivo: ${g.name}`,
        kind: 'goal',
        href: '/savings',
      });
  }
  if (
    !s.checkins.some((c) => c.actionKey === 'weekly_review' && c.completedAt.slice(0, 10) >= weekStart(today))
  ) {
    reminders.push({
      key: 'weekly-review',
      date: null,
      title: 'Revisión semanal pendiente',
      kind: 'weekly_review',
      href: '/plan',
    });
  }
  if (isMonthCloseWindow(today))
    reminders.push({
      key: 'monthly-close',
      date: null,
      title: 'Cierre mensual',
      kind: 'monthly_close',
      href: '/plan',
    });
  if (nextLessonTitle)
    reminders.push({
      key: 'lesson',
      date: null,
      title: `Lección pendiente: ${nextLessonTitle}`,
      kind: 'lesson',
      href: '/academy',
    });
  const stale = s.accounts.filter((a) => !isAccountConfirmed(a, today)).length;
  if (stale)
    reminders.push({
      key: 'reconcile',
      date: null,
      title: `${stale} cuenta(s) por conciliar`,
      kind: 'reconciliation',
      href: '/accounts',
    });

  return reminders.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
}
