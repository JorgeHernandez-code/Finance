import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { addMonthsIso, todayIso } from '@/shared/lib/dates';
import type { FinancialSnapshot, SnapshotReconciliation } from '@/domain/finance/snapshot';
import { mapDebt, mapGoal, mapRecurring, num, numOrNull } from '../mappers';

/**
 * Carga en paralelo los datos reales del usuario para los cálculos de
 * Finance 2.0. Todas las consultas pasan por RLS con la sesión del usuario
 * (anon key + cookie): nunca se usa service_role.
 */
export class SupabaseFinancialSnapshotRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async load(userId: string, today: string = todayIso()): Promise<FinancialSnapshot> {
    const since = addMonthsIso(today, -13);
    const c = this.client;
    const results = await Promise.all([
      c.from('profiles').select('default_currency, risk_tolerance').eq('id', userId).maybeSingle(),
      c
        .from('accounts')
        .select('id, name, type, currency, country, created_at, is_archived')
        .eq('user_id', userId)
        .eq('is_archived', false),
      c.from('v_account_balances').select('account_id, current_balance').eq('user_id', userId),
      c
        .from('account_reconciliations')
        .select('account_id, reconciled_on, statement_balance, computed_balance')
        .eq('user_id', userId)
        .order('reconciled_on', { ascending: false }),
      c.from('debts').select('*').eq('user_id', userId),
      c.from('v_debt_balance').select('*').eq('user_id', userId),
      c.from('savings_goals').select('*').eq('user_id', userId),
      c.from('v_savings_progress').select('*').eq('user_id', userId),
      c.from('subscriptions').select('*').eq('user_id', userId),
      c.from('budgets').select('id, category_id, amount, currency, period, created_at').eq('user_id', userId),
      c
        .from('v_budget_progress')
        .select('budget_id, category_name, spent_amount, period_start, period_end')
        .eq('user_id', userId),
      c
        .from('transactions')
        .select(
          'id, type, transfer_direction, amount, currency, transaction_date, created_at, account_id, category_id, subscription_id, description, categories:category_id(name, color)'
        )
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('transaction_date', since)
        .order('transaction_date', { ascending: false })
        .limit(5000),
      c.from('exchange_rates').select('base_currency, quote_currency, rate, rate_date').eq('user_id', userId),
      c.from('investments').select('id, name, currency, amount_invested').eq('user_id', userId),
      c.from('user_checkins').select('action_key, period_start, completed_at').eq('user_id', userId),
      c.from('lesson_progress').select('lesson_id, quiz_passed, completed_at').eq('user_id', userId),
      c
        .from('xp_events')
        .select('source_type, source_key, points, description, earned_at')
        .eq('user_id', userId),
      c.from('categories').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      // Solo el código: nunca se registran filas ni importes en logs.
      console.error('[SupabaseFinancialSnapshotRepository.load]', failed.error.code);
      throw new Error('No se pudieron cargar tus datos financieros.');
    }

    const [
      profile,
      accounts,
      balances,
      reconciliations,
      debts,
      debtBalances,
      goals,
      goalProgress,
      subs,
      budgets,
      budgetProgress,
      txs,
      rates,
      investments,
      checkins,
      lessons,
      xp,
      categories,
    ] = results;

    const goalIds = (goals.data ?? []).map((g) => g.id);
    const debtIds = (debts.data ?? []).map((d) => d.id);
    const investmentIds = (investments.data ?? []).map((i) => i.id);
    const [contributions, payments, valuations] = await Promise.all([
      goalIds.length
        ? c
            .from('savings_contributions')
            .select('savings_goal_id, amount, kind, contribution_date, created_at')
            .in('savings_goal_id', goalIds)
        : Promise.resolve({ data: [], error: null }),
      debtIds.length
        ? c.from('debt_payments').select('*').in('debt_id', debtIds)
        : Promise.resolve({ data: [], error: null }),
      investmentIds.length
        ? c
            .from('investment_valuations')
            .select('investment_id, value, valuation_date')
            .in('investment_id', investmentIds)
            .order('valuation_date', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (contributions.error || payments.error || valuations.error) {
      throw new Error('No se pudieron cargar tus datos financieros.');
    }

    const balanceByAccount = new Map(
      (balances.data ?? []).map((b) => [b.account_id, num(b.current_balance)])
    );
    const recRows: SnapshotReconciliation[] = (reconciliations.data ?? []).map((r) => ({
      accountId: r.account_id,
      date: r.reconciled_on,
      difference: num(r.statement_balance) - num(r.computed_balance),
    }));
    const lastRec = new Map<string, SnapshotReconciliation>();
    for (const r of recRows) if (!lastRec.has(r.accountId)) lastRec.set(r.accountId, r);

    const debtBalanceById = new Map((debtBalances.data ?? []).map((b) => [b.debt_id, b]));
    const progressById = new Map((goalProgress.data ?? []).map((p) => [p.goal_id, p]));
    const budgetProgressById = new Map((budgetProgress.data ?? []).map((p) => [p.budget_id, p]));
    const latestValuation = new Map<string, { value: number; date: string }>();
    for (const v of valuations.data ?? [])
      if (!latestValuation.has(v.investment_id))
        latestValuation.set(v.investment_id, { value: num(v.value), date: v.valuation_date });

    type TxRow = {
      id: string;
      type: 'income' | 'expense' | 'transfer';
      transfer_direction: 'in' | 'out' | null;
      amount: number;
      currency: string;
      transaction_date: string;
      created_at: string;
      account_id: string;
      category_id: string | null;
      subscription_id: string | null;
      description: string;
      categories: { name: string; color: string } | null;
    };

    return {
      today,
      defaultCurrency: profile.data?.default_currency ?? 'COP',
      riskTolerance: profile.data?.risk_tolerance ?? null,
      accounts: (accounts.data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        country: a.country ?? null,
        currentBalance: balanceByAccount.get(a.id) ?? 0,
        createdAt: a.created_at,
        lastReconciledOn: lastRec.get(a.id)?.date ?? null,
        lastReconciliationDifference: lastRec.get(a.id)?.difference ?? null,
      })),
      reconciliations: recRows,
      debts: (debts.data ?? []).map((d) => mapDebt(d, debtBalanceById.get(d.id))),
      debtPayments: (payments.data ?? []).map((p) => ({
        id: p.id,
        debtId: p.debt_id,
        amount: num(p.amount),
        paymentDate: p.payment_date,
        interestAmount: numOrNull(p.interest_amount),
        feesAmount: numOrNull(p.fees_amount),
        transactionId: p.transaction_id ?? null,
        createdAt: p.created_at,
      })),
      goals: (goals.data ?? []).map((g) => mapGoal(g, progressById.get(g.id))),
      contributions: (contributions.data ?? []).map((c) => ({
        goalId: c.savings_goal_id,
        amount: num(c.amount),
        kind: c.kind ?? 'deposit',
        date: c.contribution_date,
        createdAt: c.created_at,
      })),
      recurring: (subs.data ?? []).map(mapRecurring),
      budgets: (budgets.data ?? []).map((b) => {
        const p = budgetProgressById.get(b.id);
        return {
          id: b.id,
          categoryId: b.category_id,
          categoryName: p?.category_name ?? '—',
          amount: num(b.amount),
          currency: b.currency ?? 'COP',
          period: b.period,
          spent: num(p?.spent_amount),
          periodStart: p?.period_start ?? today,
          periodEnd: p?.period_end ?? today,
          createdAt: b.created_at,
        };
      }),
      transactions: ((txs.data ?? []) as unknown as TxRow[]).map((t) => ({
        id: t.id,
        type: t.type,
        transferDirection: t.transfer_direction,
        amount: num(t.amount),
        currency: t.currency,
        date: t.transaction_date,
        createdAt: t.created_at,
        accountId: t.account_id,
        categoryId: t.category_id,
        categoryName: t.categories?.name ?? null,
        categoryColor: t.categories?.color ?? null,
        subscriptionId: t.subscription_id,
        description: t.description,
      })),
      rates: (rates.data ?? []).map((r) => ({
        base: r.base_currency,
        quote: r.quote_currency,
        rate: num(r.rate),
        date: r.rate_date,
      })),
      investments: (investments.data ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        currency: i.currency ?? 'COP',
        amountInvested: num(i.amount_invested),
        latestValue: latestValuation.get(i.id)?.value ?? null,
        latestValuationDate: latestValuation.get(i.id)?.date ?? null,
      })),
      checkins: (checkins.data ?? []).map((ch) => ({
        actionKey: ch.action_key,
        periodStart: ch.period_start,
        completedAt: ch.completed_at,
      })),
      lessons: (lessons.data ?? []).map((l) => ({
        lessonId: l.lesson_id,
        quizPassed: l.quiz_passed,
        completedAt: l.completed_at,
      })),
      xpEvents: (xp.data ?? []).map((e) => ({
        sourceType: e.source_type,
        sourceKey: e.source_key,
        points: e.points,
        description: e.description,
        earnedAt: e.earned_at,
      })),
      categoryCount: categories.count ?? 0,
    };
  }
}
