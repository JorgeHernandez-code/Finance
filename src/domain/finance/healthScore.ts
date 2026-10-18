/**
 * Índice de Salud Financiera — reglas v1.
 *
 * Es un indicador PERSONAL de organización y progreso. No es un puntaje
 * crediticio ni una evaluación de solvencia de ninguna institución.
 *
 * Principios (cada uno cubierto por pruebas en __tests__/domain/healthScore.test.ts):
 *  - Ningún punto depende de cuánto dinero hay ni de cuánto se debe.
 *  - Tener deudas antiguas no resta: solo cuentan las cuotas ACORDADAS que
 *    vencían en el periodo. Una deuda sin fecha acordada no es "vencida".
 *  - Pocos datos no dan puntaje alto: los puntos de registro exigen
 *    movimientos reales; con muy pocos datos se muestra "Puntaje en construcción".
 *  - No poder ahorrar no castiga: si el historial muestra déficit, el ítem
 *    "aportar a una meta" queda como "no aplica".
 *  - "No aplica" solo se usa por hechos comprobables, y se explica.
 *  - Determinista: mismo snapshot + mismo periodo = mismo resultado.
 */
import {
  addDaysIso,
  daysBetween,
  isBetween,
  monthStart,
  type IsoDate,
  type Period,
} from '@/shared/lib/dates';
import { sumMoney } from '@/shared/lib/money';
import { monthlyCapacity } from './cashflow';
import { debtGaps, agreedDate, isOpenDebt } from './debts';
import type { FinancialSnapshot, SnapshotDebt } from './snapshot';

export const HEALTH_RULES_VERSION = 'v1';

export type ComponentKey = 'record' | 'obligations' | 'cashflow' | 'savings' | 'planning';

export const COMPONENT_LABEL: Record<ComponentKey, string> = {
  record: 'Control y registro financiero',
  obligations: 'Cumplimiento de obligaciones acordadas',
  cashflow: 'Control del flujo de caja',
  savings: 'Progreso en ahorro y fondo de emergencia',
  planning: 'Planificación y educación financiera',
};

export interface ScoreItem {
  key: string;
  label: string;
  max: number;
  earned: number;
  applicable: boolean;
  /** Qué se midió y con qué resultado. */
  detail: string;
  /** Cómo sumar estos puntos (vacío si ya están completos o no aplica). */
  howToImprove: string;
}

export interface ScoreComponent {
  key: ComponentKey;
  label: string;
  /** Puntos sobre 20, reescalados si algún ítem no aplica. null si nada aplica. */
  score: number | null;
  items: ScoreItem[];
}

export type Confidence = 'building' | 'low' | 'medium' | 'high';

export interface HealthScore {
  rulesVersion: string;
  period: Period;
  /** null = "Puntaje en construcción". */
  score: number | null;
  confidence: Confidence;
  confidenceReason: string;
  components: ScoreComponent[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const frac = (n: number, d: number) => (d === 0 ? 0 : Math.min(1, n / d));

function item(
  key: string,
  label: string,
  max: number,
  ratio: number,
  detail: string,
  howToImprove: string,
  applicable = true
): ScoreItem {
  const clamped = Math.max(0, Math.min(1, ratio));
  return {
    key,
    label,
    max,
    earned: applicable ? round1(max * clamped) : 0,
    applicable,
    detail,
    howToImprove: applicable && clamped < 1 ? howToImprove : '',
  };
}

/** Datos tal como existían al final del periodo (para calcular periodos pasados). */
function asOf(snapshot: FinancialSnapshot, end: IsoDate) {
  const endTs = `${end}T23:59:59.999Z`;
  const createdBy = (createdAt: string) => createdAt <= endTs;
  return {
    transactions: snapshot.transactions.filter((t) => createdBy(t.createdAt)),
    accounts: snapshot.accounts.filter((a) => createdBy(a.createdAt)),
    debts: snapshot.debts.filter((d) => createdBy(d.createdAt)),
    goals: snapshot.goals.filter((g) => createdBy(g.createdAt)),
    budgets: snapshot.budgets.filter((b) => createdBy(b.createdAt)),
    checkins: snapshot.checkins.filter((c) => createdBy(c.completedAt)),
    lessons: snapshot.lessons.filter((l) => l.completedAt !== null && createdBy(l.completedAt)),
    reconciliations: snapshot.reconciliations.filter((r) => r.date <= end),
    contributions: snapshot.contributions.filter((c) => c.date <= end && createdBy(c.createdAt)),
    payments: snapshot.debtPayments.filter((p) => p.paymentDate <= end && createdBy(p.createdAt)),
  };
}

function countCheckins(
  checkins: { actionKey: string; completedAt: string }[],
  key: string,
  from: IsoDate,
  to: IsoDate
): number {
  return checkins.filter((c) => c.actionKey === key && isBetween(c.completedAt.slice(0, 10), from, to))
    .length;
}

export function computeHealthScore(snapshot: FinancialSnapshot, period: Period): HealthScore {
  const { start, end } = period;
  const data = asOf(snapshot, end);
  const isWeek = period.type === 'week';
  const inPeriod = (date: string) => isBetween(date.slice(0, 10), start, end);

  // ---------------- Datos mínimos
  const firstActivity =
    [...data.transactions.map((t) => t.createdAt), ...data.accounts.map((a) => a.createdAt)]
      .sort()[0]
      ?.slice(0, 10) ?? null;
  const periodMovements = data.transactions.filter((t) => t.type !== 'transfer' && inPeriod(t.date)).length;
  const building =
    data.accounts.length === 0 ||
    data.transactions.length < 5 ||
    firstActivity === null ||
    daysBetween(firstActivity, end) < 7;

  // ---------------- 1. Control y registro
  const loggingDays = new Set(
    data.transactions.filter((t) => inPeriod(t.createdAt)).map((t) => t.createdAt.slice(0, 10))
  ).size;
  const loggingRatio = isWeek
    ? loggingDays >= 3
      ? 1
      : loggingDays === 2
        ? 0.625
        : loggingDays === 1
          ? 0.375
          : 0
    : frac(loggingDays, 8);
  const reconciledAccounts = data.accounts.filter((a) =>
    data.reconciliations.some((r) => r.accountId === a.id && daysBetween(r.date, end) <= 35)
  ).length;
  const periodExpenses = data.transactions.filter((t) => t.type === 'expense' && inPeriod(t.date));
  const categorized = periodExpenses.filter((t) => t.categoryId).length;
  const weeklyReviews = countCheckins(data.checkins, 'weekly_review', start, end);

  const record: ScoreItem[] = [
    item(
      'logging_days',
      'Registro constante',
      8,
      loggingRatio,
      `Registraste movimientos en ${loggingDays} día(s) ${isWeek ? 'de la semana (meta: 3)' : 'del mes (meta: 8)'}.`,
      'Registra tus gastos el mismo día, varios días a la semana.'
    ),
    item(
      'reconciled_accounts',
      'Cuentas conciliadas',
      6,
      frac(reconciledAccounts, data.accounts.length),
      `${reconciledAccounts} de ${data.accounts.length} cuenta(s) conciliadas en los últimos 35 días.`,
      'Compara el saldo de cada cuenta con tu banco o billetera y regístralo con "Conciliar".',
      data.accounts.length > 0
    ),
    item(
      'categorized',
      'Gastos categorizados',
      3,
      frac(categorized, periodExpenses.length),
      periodExpenses.length
        ? `${categorized} de ${periodExpenses.length} gastos con categoría.`
        : 'No hubo gastos en el periodo: no aplica.',
      'Asigna una categoría a cada gasto.',
      periodExpenses.length > 0
    ),
    item(
      'weekly_review',
      'Revisión semanal',
      3,
      isWeek ? Math.min(1, weeklyReviews) : weeklyReviews >= 2 ? 1 : weeklyReviews * 0.5,
      `${weeklyReviews} revisión(es) semanal(es) registradas.`,
      'Haz la revisión semanal desde el dashboard (5 minutos).'
    ),
  ];

  // ---------------- 2. Obligaciones acordadas
  const inventoryDone = countCheckins(data.checkins, 'debts_inventory', addDaysIso(end, -90), end) > 0;
  const openDebts = data.debts.filter((d) => d.direction === 'i_owe' && isOpenDebt(d));
  const completeDebts = openDebts.filter((d) =>
    // Información completa = tipo, país e interés. El saldo se mide aparte (ítem "Saldos confirmados").
    debtGaps(d, end).every(
      (g) => g === 'balance_unconfirmed' || g === 'balance_unknown' || g === 'amount_estimate'
    )
  ).length;
  const confirmedDebts = openDebts.filter(
    (d) =>
      d.balanceConfirmedAt !== null &&
      d.balanceConfirmedAt <= end &&
      daysBetween(d.balanceConfirmedAt, end) <= 90
  ).length;

  const paymentsInPeriod = (d: SnapshotDebt) =>
    data.payments.filter((p) => p.debtId === d.id && inPeriod(p.paymentDate));
  // Solo obligaciones con fecha ACORDADA dentro del periodo (o con pagos en él).
  // Las deudas sin fecha, o con fecha anterior al periodo, no restan aquí.
  const dueInPeriod = data.debts.filter((d) => {
    if (d.direction !== 'i_owe') return false;
    const date = agreedDate(d);
    return (date !== null && inPeriod(date)) || paymentsInPeriod(d).length > 0;
  });
  const attended = dueInPeriod.filter((d) => {
    // Negociar o tener un acuerdo es atender la obligación cuando no se puede pagar.
    if (d.status === 'negotiating' || d.status === 'agreement') return true;
    const paid = sumMoney(paymentsInPeriod(d).map((p) => p.amount));
    return d.installmentAmount ? paid >= d.installmentAmount * 0.95 : paid > 0 || d.status === 'paid';
  }).length;

  const obligations: ScoreItem[] = [
    item(
      'debts_inventory',
      'Inventario de deudas',
      4,
      inventoryDone ? 1 : 0,
      inventoryDone
        ? 'Confirmaste que todas tus deudas están registradas.'
        : 'No has confirmado el inventario de deudas en los últimos 90 días.',
      'Registra todas tus deudas (aunque no sepas el saldo exacto) y confirma el inventario.'
    ),
    item(
      'debts_complete',
      'Deudas con información completa',
      6,
      openDebts.length ? frac(completeDebts, openDebts.length) : inventoryDone ? 1 : 0,
      openDebts.length
        ? `${completeDebts} de ${openDebts.length} deuda(s) con tipo, país e interés indicados.`
        : 'Sin deudas abiertas registradas.',
      openDebts.length
        ? 'Completa tipo, país e interés (o 0 %) en cada deuda.'
        : 'Confirma el inventario de deudas.'
    ),
    item(
      'debts_confirmed',
      'Saldos confirmados',
      4,
      openDebts.length ? frac(confirmedDebts, openDebts.length) : inventoryDone ? 1 : 0,
      openDebts.length
        ? `${confirmedDebts} de ${openDebts.length} saldo(s) confirmados con el acreedor en los últimos 90 días.`
        : 'Sin deudas abiertas registradas.',
      'Pide el saldo actualizado al acreedor y regístralo como confirmado.'
    ),
    item(
      'agreed_payments',
      'Cuotas acordadas atendidas',
      6,
      frac(attended, dueInPeriod.length),
      dueInPeriod.length
        ? `${attended} de ${dueInPeriod.length} obligación(es) con fecha en el periodo atendidas (pagadas o en negociación).`
        : 'No había cuotas con fecha acordada en este periodo: no aplica (las deudas sin fecha no se consideran vencidas).',
      'Paga la cuota acordada o, si no puedes, contacta al acreedor y marca la deuda "En negociación".',
      dueInPeriod.length > 0
    ),
  ];

  // ---------------- 3. Flujo de caja (se mide el mes en curso hasta el final del periodo)
  const monthFrom = monthStart(end);
  const monthlyBudgets = data.budgets.filter((b) => b.period === 'monthly');
  const spentIn = (b: (typeof monthlyBudgets)[number]) =>
    sumMoney(
      data.transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.categoryId === b.categoryId &&
            t.currency === b.currency &&
            isBetween(t.date, monthFrom, end)
        )
        .map((t) => t.amount)
    );
  const respected = monthlyBudgets.filter((b) => spentIn(b) <= b.amount).length;
  const flowTx = data.transactions.filter(
    (t) =>
      t.type !== 'transfer' && t.currency === snapshot.defaultCurrency && isBetween(t.date, monthFrom, end)
  );
  const flowIncome = sumMoney(flowTx.filter((t) => t.type === 'income').map((t) => t.amount));
  const flowExpense = sumMoney(flowTx.filter((t) => t.type === 'expense').map((t) => t.amount));
  const activeRecurring = snapshot.recurring.filter((r) => r.status === 'active');
  const recurringReviewed =
    countCheckins(data.checkins, 'subscriptions_review', addDaysIso(end, -30), end) > 0 ||
    (activeRecurring.length > 0 &&
      activeRecurring.every(
        (r) =>
          r.lastReviewedAt !== null && r.lastReviewedAt <= end && daysBetween(r.lastReviewedAt, end) <= 90
      ));

  const cashflow: ScoreItem[] = [
    item(
      'budget_exists',
      'Presupuesto mensual',
      6,
      monthlyBudgets.length >= 3 ? 1 : monthlyBudgets.length >= 1 ? 4 / 6 : 0,
      `${monthlyBudgets.length} presupuesto(s) mensual(es) por categoría.`,
      'Crea presupuestos para tus 3 categorías de mayor gasto.'
    ),
    item(
      'budget_respected',
      'Presupuestos respetados',
      6,
      frac(respected, monthlyBudgets.length),
      monthlyBudgets.length
        ? `${respected} de ${monthlyBudgets.length} presupuesto(s) dentro del límite en el mes.`
        : 'Sin presupuestos: no aplica.',
      'Revisa las categorías que se pasaron y ajusta el gasto o el presupuesto a algo realista.',
      monthlyBudgets.length > 0
    ),
    item(
      'income_vs_expense',
      'Ingresos cubren gastos',
      5,
      flowTx.length === 0 ? 0 : flowIncome >= flowExpense ? 1 : 0,
      flowTx.length
        ? `En el mes (${snapshot.defaultCurrency}) los ingresos ${flowIncome >= flowExpense ? 'cubren' : 'no cubren'} los gastos registrados.`
        : 'Sin movimientos registrados en el mes.',
      flowTx.length
        ? 'Identifica gastos variables que puedas reducir o fuentes de ingreso adicionales.'
        : 'Registra tus ingresos y gastos del mes.'
    ),
    item(
      'recurring_reviewed',
      'Recurrentes revisados',
      3,
      recurringReviewed ? 1 : 0,
      activeRecurring.length
        ? recurringReviewed
          ? 'Revisaste tus gastos recurrentes recientemente.'
          : 'Hace más de 30 días que no revisas tus recurrentes.'
        : 'Sin gastos recurrentes registrados: no aplica.',
      'Revisa tus suscripciones y marca las que ya revisaste.',
      activeRecurring.length > 0
    ),
  ];

  // ---------------- 4. Ahorro y fondo de emergencia
  const liveGoals = data.goals.filter((g) => g.status !== 'cancelled' && g.status !== 'archived');
  const emergency = liveGoals.find((g) => g.isEmergencyFund);
  const deposits = data.contributions.filter((c) => c.kind === 'deposit' && inPeriod(c.date)).length;
  const cannotSave = monthlyCapacity(snapshot, snapshot.defaultCurrency).status === 'deficit';

  const savings: ScoreItem[] = [
    item(
      'has_goal',
      'Meta de ahorro definida',
      5,
      liveGoals.length ? 1 : 0,
      `${liveGoals.length} meta(s) de ahorro.`,
      'Crea una meta, aunque sea pequeña.'
    ),
    item(
      'emergency_goal',
      'Fondo de emergencia',
      5,
      emergency ? 1 : 0,
      emergency
        ? `Tienes la meta "${emergency.name}" como fondo de emergencia.`
        : 'No hay meta marcada como fondo de emergencia.',
      'Crea una meta de fondo de emergencia (empieza con un objetivo pequeño).'
    ),
    item(
      'contribution',
      'Aporte en el periodo',
      6,
      deposits > 0 ? 1 : 0,
      cannotSave
        ? 'Tu historial muestra que lo esencial y las cuotas superan tus ingresos: no aplica (no se penaliza no poder ahorrar).'
        : `${deposits} aporte(s) a metas en el periodo.`,
      'Aporta cualquier monto que puedas permitirte, por pequeño que sea.',
      !cannotSave
    ),
    item(
      'emergency_progress',
      'Avance del fondo',
      4,
      emergency && emergency.targetAmount ? frac(emergency.currentAmount, emergency.targetAmount) : 0,
      emergency
        ? emergency.targetAmount
          ? `Fondo al ${Math.round(frac(emergency.currentAmount, emergency.targetAmount) * 100)} % de su objetivo.`
          : 'El fondo no tiene monto objetivo definido.'
        : 'Sin fondo de emergencia: no aplica.',
      'Cada aporte al fondo suma.',
      !!emergency
    ),
  ];

  // ---------------- 5. Planificación y educación
  const lessonsInPeriod = data.lessons.filter(
    (l) => l.completedAt !== null && inPeriod(l.completedAt)
  ).length;
  const monthlyClose =
    countCheckins(data.checkins, 'monthly_close', isWeek ? addDaysIso(end, -35) : start, end) > 0;
  const obligationsReviews = countCheckins(data.checkins, 'obligations_review', start, end);

  const planning: ScoreItem[] = [
    item(
      'lessons_period',
      'Aprendizaje en el periodo',
      8,
      isWeek ? Math.min(1, lessonsInPeriod) : lessonsInPeriod >= 2 ? 1 : lessonsInPeriod * 0.5,
      `${lessonsInPeriod} lección(es) completada(s) ${isWeek ? '(meta: 1)' : '(meta: 2)'}.`,
      'Completa una lección de la Academia.'
    ),
    item(
      'lessons_total',
      'Base de conocimientos',
      2,
      frac(data.lessons.length, 3),
      `${data.lessons.length} lección(es) completadas en total.`,
      'Completa las lecciones del Nivel 1.'
    ),
    item(
      'monthly_close',
      'Cierre mensual',
      5,
      monthlyClose ? 1 : 0,
      monthlyClose ? 'Hiciste el cierre mensual.' : 'Sin cierre mensual reciente.',
      'Haz el cierre de mes desde "Mi plan".'
    ),
    item(
      'obligations_review',
      'Revisión de próximos pagos',
      5,
      isWeek ? Math.min(1, obligationsReviews) : obligationsReviews >= 2 ? 1 : obligationsReviews * 0.5,
      `${obligationsReviews} revisión(es) de próximos pagos.`,
      'Revisa tus próximos vencimientos cada semana.'
    ),
  ];

  const groups: [ComponentKey, ScoreItem[]][] = [
    ['record', record],
    ['obligations', obligations],
    ['cashflow', cashflow],
    ['savings', savings],
    ['planning', planning],
  ];
  const components: ScoreComponent[] = groups.map(([key, items]) => {
    const applicableMax = items.filter((i) => i.applicable).reduce((s, i) => s + i.max, 0);
    const earned = items.reduce((s, i) => s + i.earned, 0);
    return {
      key,
      label: COMPONENT_LABEL[key],
      items,
      score: applicableMax ? round1((earned / applicableMax) * 20) : null,
    };
  });

  const allItems = components.flatMap((c) => c.items);
  const applicableMax = allItems.filter((i) => i.applicable).reduce((s, i) => s + i.max, 0);
  const earned = allItems.reduce((s, i) => s + i.earned, 0);
  const coverage = applicableMax / 100;

  let confidence: Confidence;
  let confidenceReason: string;
  if (building) {
    confidence = 'building';
    confidenceReason =
      'Aún hay pocos datos: se necesitan al menos una cuenta, 5 movimientos y una semana de uso.';
  } else if (periodMovements < (isWeek ? 3 : 8) || reconciledAccounts === 0 || coverage < 0.6) {
    confidence = 'low';
    confidenceReason =
      'Pocos movimientos en el periodo, ninguna cuenta conciliada o muchos ítems que no aplican.';
  } else if (
    periodMovements >= (isWeek ? 5 : 20) &&
    reconciledAccounts === data.accounts.length &&
    inventoryDone
  ) {
    confidence = 'high';
    confidenceReason = 'Registro constante, cuentas conciliadas e inventario de deudas confirmado.';
  } else {
    confidence = 'medium';
    confidenceReason =
      'Datos suficientes, aunque no todas las cuentas están conciliadas o falta el inventario de deudas.';
  }

  return {
    rulesVersion: HEALTH_RULES_VERSION,
    period,
    score: building || applicableMax === 0 ? null : Math.round((earned / applicableMax) * 100),
    confidence,
    confidenceReason,
    components,
  };
}

/** Periodo del índice ya guardado en el historial (health_score_snapshots). */
export interface StoredHealthSnapshot {
  periodType: 'week' | 'month';
  periodStart: string;
  score: number | null;
  confidence: Confidence;
  rulesVersion: string;
  isFinal: boolean;
  computedAt: string;
}
