import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IBackupRepository } from '@/domain/repositories/IBackupRepository';
import type { BackupBundle, BackupImportSummary } from '@/domain/entities/Backup';

export class SupabaseBackupRepository implements IBackupRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async exportAll(userId: string): Promise<BackupBundle> {
    const [profileRes, accountsRes, categoriesRes, clientsRes, subscriptionsRes, budgetsRes, debtsRes, savingsGoalsRes, investmentsRes, transactionsRes] =
      await Promise.all([
        this.client.from('profiles').select('full_name, default_currency, locale, theme').eq('id', userId).single(),
        this.client.from('accounts').select('*').eq('user_id', userId),
        this.client.from('categories').select('*').eq('user_id', userId),
        this.client.from('clients').select('*').eq('user_id', userId),
        this.client.from('subscriptions').select('*').eq('user_id', userId),
        this.client.from('budgets').select('*').eq('user_id', userId),
        this.client.from('debts').select('*').eq('user_id', userId),
        this.client.from('savings_goals').select('*').eq('user_id', userId),
        this.client.from('investments').select('*').eq('user_id', userId),
        this.client.from('transactions').select('*').eq('user_id', userId).is('deleted_at', null),
      ]);

    for (const [label, res] of Object.entries({
      profile: profileRes,
      accounts: accountsRes,
      categories: categoriesRes,
      clients: clientsRes,
      subscriptions: subscriptionsRes,
      budgets: budgetsRes,
      debts: debtsRes,
      savingsGoals: savingsGoalsRes,
      investments: investmentsRes,
      transactions: transactionsRes,
    })) {
      if (res.error) {
        console.error(`[SupabaseBackupRepository.exportAll ${label}]`, res.error);
        throw new Error(`No se pudo exportar ${label}: ${res.error.message}`);
      }
    }

    const debtIds = (debtsRes.data ?? []).map((d) => d.id);
    const savingsGoalIds = (savingsGoalsRes.data ?? []).map((g) => g.id);
    const investmentIds = (investmentsRes.data ?? []).map((i) => i.id);

    const [debtPaymentsRes, savingsContributionsRes, investmentValuationsRes] = await Promise.all([
      debtIds.length > 0
        ? this.client.from('debt_payments').select('*').in('debt_id', debtIds)
        : Promise.resolve({ data: [], error: null }),
      savingsGoalIds.length > 0
        ? this.client.from('savings_contributions').select('*').in('savings_goal_id', savingsGoalIds)
        : Promise.resolve({ data: [], error: null }),
      investmentIds.length > 0
        ? this.client.from('investment_valuations').select('*').in('investment_id', investmentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (debtPaymentsRes.error) throw new Error(`No se pudieron exportar los abonos de deudas: ${debtPaymentsRes.error.message}`);
    if (savingsContributionsRes.error)
      throw new Error(`No se pudieron exportar los aportes de ahorro: ${savingsContributionsRes.error.message}`);
    if (investmentValuationsRes.error)
      throw new Error(`No se pudieron exportar las valuaciones de inversión: ${investmentValuationsRes.error.message}`);

    const profile = profileRes.data;
    if (!profile) throw new Error('No se pudo cargar el perfil para el respaldo.');

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        fullName: profile.full_name,
        defaultCurrency: profile.default_currency,
        locale: profile.locale,
        theme: profile.theme,
      },
      accounts: (accountsRes.data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        institution: a.institution,
        currency: a.currency,
        initialBalance: a.initial_balance,
        color: a.color,
        icon: a.icon,
        isArchived: a.is_archived,
      })),
      categories: (categoriesRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent_id,
        color: c.color,
        icon: c.icon,
        isSystem: c.is_system,
      })),
      clients: (clientsRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        status: c.status,
        notes: c.notes,
      })),
      subscriptions: (subscriptionsRes.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        categoryId: s.category_id,
        accountId: s.account_id,
        amount: s.amount,
        currency: s.currency,
        billingCycle: s.billing_cycle,
        nextBillingDate: s.next_billing_date,
        status: s.status,
        icon: s.icon,
        color: s.color,
      })),
      budgets: (budgetsRes.data ?? []).map((b) => ({
        id: b.id,
        categoryId: b.category_id,
        amount: b.amount,
        period: b.period,
        startDate: b.start_date,
        endDate: b.end_date,
        alertThresholdPercent: b.alert_threshold_percent,
      })),
      debts: (debtsRes.data ?? []).map((d) => ({
        id: d.id,
        creditorName: d.creditor_name,
        direction: d.direction,
        principalAmount: d.principal_amount,
        interestRate: d.interest_rate,
        startDate: d.start_date,
        dueDate: d.due_date,
        status: d.status,
        notes: d.notes,
      })),
      debtPayments: (debtPaymentsRes.data ?? []).map((p) => ({
        debtId: p.debt_id,
        amount: p.amount,
        paymentDate: p.payment_date,
        notes: p.notes,
      })),
      savingsGoals: (savingsGoalsRes.data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.target_amount,
        targetDate: g.target_date,
        icon: g.icon,
        color: g.color,
        status: g.status,
      })),
      savingsContributions: (savingsContributionsRes.data ?? []).map((c) => ({
        savingsGoalId: c.savings_goal_id,
        amount: c.amount,
        contributionDate: c.contribution_date,
        notes: c.notes ?? null,
      })),
      investments: (investmentsRes.data ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        amountInvested: i.amount_invested,
        startDate: i.start_date,
        notes: i.notes,
      })),
      investmentValuations: (investmentValuationsRes.data ?? []).map((v) => ({
        investmentId: v.investment_id,
        value: v.value,
        valuationDate: v.valuation_date,
      })),
      transactions: (transactionsRes.data ?? []).map((t) => ({
        id: t.id,
        accountId: t.account_id,
        categoryId: t.category_id,
        clientId: t.client_id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        notes: t.notes,
        transactionDate: t.transaction_date,
      })),
    };
  }

  /**
   * Restaura en orden de dependencias (padres antes que hijos) e insertando
   * fila por fila para poder mapear id-viejo -> id-nuevo de forma confiable
   * (un insert masivo no garantiza que el orden de la respuesta calce con el
   * del array enviado). Las categorías del sistema (is_system) no se
   * reinsertan — cada usuario ya las tiene sembradas por el trigger de alta;
   * se remapean por nombre para no duplicar "Comida", "Transporte", etc.
   * Es best-effort: si una fila falla o referencia algo que no se pudo
   * resolver, se cuenta en `skipped` y se sigue con el resto en vez de abortar
   * todo el restore.
   */
  async importAll(userId: string, bundle: BackupBundle): Promise<BackupImportSummary> {
    const summary: BackupImportSummary = {
      accounts: 0,
      categories: 0,
      clients: 0,
      subscriptions: 0,
      budgets: 0,
      debts: 0,
      debtPayments: 0,
      savingsGoals: 0,
      savingsContributions: 0,
      investments: 0,
      investmentValuations: 0,
      transactions: 0,
      skipped: 0,
    };

    const { data: existingSystemCategories } = await this.client
      .from('categories')
      .select('id, name, type')
      .eq('user_id', userId)
      .eq('is_system', true);

    const systemCategoryByNameType = new Map((existingSystemCategories ?? []).map((c) => [`${c.name}::${c.type}`, c.id]));

    const categoryIdMap = new Map<string, string>();
    for (const category of bundle.categories) {
      if (category.isSystem) {
        const matchId = systemCategoryByNameType.get(`${category.name}::${category.type}`);
        if (matchId) categoryIdMap.set(category.id, matchId);
        continue;
      }

      const { data, error } = await this.client
        .from('categories')
        .insert({
          user_id: userId,
          name: category.name,
          type: category.type as 'income' | 'expense',
          color: category.color,
          icon: category.icon,
          is_system: false,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('[SupabaseBackupRepository.importAll category]', error);
        summary.skipped++;
        continue;
      }
      categoryIdMap.set(category.id, data.id);
      summary.categories++;
    }
    // Segunda pasada para parent_id (puede apuntar a una categoría creada en esta misma tanda).
    for (const category of bundle.categories) {
      if (category.isSystem || !category.parentId) continue;
      const newId = categoryIdMap.get(category.id);
      const newParentId = categoryIdMap.get(category.parentId);
      if (!newId || !newParentId) continue;
      await this.client.from('categories').update({ parent_id: newParentId }).eq('id', newId).eq('user_id', userId);
    }

    const accountIdMap = new Map<string, string>();
    for (const account of bundle.accounts) {
      const { data, error } = await this.client
        .from('accounts')
        .insert({
          user_id: userId,
          name: account.name,
          type: account.type as 'cash' | 'bank' | 'digital_wallet' | 'credit_card' | 'other',
          institution: account.institution,
          currency: account.currency,
          initial_balance: account.initialBalance,
          color: account.color,
          icon: account.icon,
          is_archived: account.isArchived,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('[SupabaseBackupRepository.importAll account]', error);
        summary.skipped++;
        continue;
      }
      accountIdMap.set(account.id, data.id);
      summary.accounts++;
    }

    const clientIdMap = new Map<string, string>();
    for (const backupClient of bundle.clients) {
      const { data, error } = await this.client
        .from('clients')
        .insert({
          user_id: userId,
          name: backupClient.name,
          color: backupClient.color,
          icon: backupClient.icon,
          status: backupClient.status as 'active' | 'inactive',
          notes: backupClient.notes,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('[SupabaseBackupRepository.importAll client]', error);
        summary.skipped++;
        continue;
      }
      clientIdMap.set(backupClient.id, data.id);
      summary.clients++;
    }

    for (const subscription of bundle.subscriptions) {
      const { error } = await this.client.from('subscriptions').insert({
        user_id: userId,
        name: subscription.name,
        category_id: subscription.categoryId ? (categoryIdMap.get(subscription.categoryId) ?? null) : null,
        account_id: subscription.accountId ? (accountIdMap.get(subscription.accountId) ?? null) : null,
        amount: subscription.amount,
        currency: subscription.currency,
        billing_cycle: subscription.billingCycle as 'weekly' | 'monthly' | 'yearly',
        next_billing_date: subscription.nextBillingDate,
        status: subscription.status as 'active' | 'paused' | 'cancelled',
        icon: subscription.icon,
        color: subscription.color,
      });

      if (error) {
        console.error('[SupabaseBackupRepository.importAll subscription]', error);
        summary.skipped++;
        continue;
      }
      summary.subscriptions++;
    }

    for (const budget of bundle.budgets) {
      const newCategoryId = categoryIdMap.get(budget.categoryId);
      if (!newCategoryId) {
        summary.skipped++;
        continue;
      }
      const { error } = await this.client.from('budgets').insert({
        user_id: userId,
        category_id: newCategoryId,
        amount: budget.amount,
        period: budget.period as 'monthly' | 'yearly',
        start_date: budget.startDate,
        end_date: budget.endDate,
        alert_threshold_percent: budget.alertThresholdPercent,
      });

      if (error) {
        console.error('[SupabaseBackupRepository.importAll budget]', error);
        summary.skipped++;
        continue;
      }
      summary.budgets++;
    }

    const debtIdMap = new Map<string, string>();
    for (const debt of bundle.debts) {
      const { data, error } = await this.client
        .from('debts')
        .insert({
          user_id: userId,
          creditor_name: debt.creditorName,
          direction: debt.direction as 'i_owe' | 'owed_to_me',
          principal_amount: debt.principalAmount,
          interest_rate: debt.interestRate,
          start_date: debt.startDate,
          due_date: debt.dueDate,
          status: debt.status as 'active' | 'paid' | 'overdue',
          notes: debt.notes,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('[SupabaseBackupRepository.importAll debt]', error);
        summary.skipped++;
        continue;
      }
      debtIdMap.set(debt.id, data.id);
      summary.debts++;
    }

    for (const payment of bundle.debtPayments) {
      const newDebtId = debtIdMap.get(payment.debtId);
      if (!newDebtId) {
        summary.skipped++;
        continue;
      }
      const { error } = await this.client
        .from('debt_payments')
        .insert({ debt_id: newDebtId, amount: payment.amount, payment_date: payment.paymentDate, notes: payment.notes });

      if (error) {
        console.error('[SupabaseBackupRepository.importAll debtPayment]', error);
        summary.skipped++;
        continue;
      }
      summary.debtPayments++;
    }

    const savingsGoalIdMap = new Map<string, string>();
    for (const goal of bundle.savingsGoals) {
      const { data, error } = await this.client
        .from('savings_goals')
        .insert({
          user_id: userId,
          name: goal.name,
          target_amount: goal.targetAmount,
          target_date: goal.targetDate,
          icon: goal.icon,
          color: goal.color,
          status: goal.status as 'active' | 'completed' | 'archived',
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('[SupabaseBackupRepository.importAll savingsGoal]', error);
        summary.skipped++;
        continue;
      }
      savingsGoalIdMap.set(goal.id, data.id);
      summary.savingsGoals++;
    }

    for (const contribution of bundle.savingsContributions) {
      const newGoalId = savingsGoalIdMap.get(contribution.savingsGoalId);
      if (!newGoalId) {
        summary.skipped++;
        continue;
      }
      const { error } = await this.client.from('savings_contributions').insert({
        savings_goal_id: newGoalId,
        amount: contribution.amount,
        contribution_date: contribution.contributionDate,
        notes: contribution.notes,
      });

      if (error) {
        console.error('[SupabaseBackupRepository.importAll savingsContribution]', error);
        summary.skipped++;
        continue;
      }
      summary.savingsContributions++;
    }

    const investmentIdMap = new Map<string, string>();
    for (const investment of bundle.investments) {
      const { data, error } = await this.client
        .from('investments')
        .insert({
          user_id: userId,
          name: investment.name,
          type: investment.type as 'stocks' | 'crypto' | 'real_estate' | 'business' | 'other',
          amount_invested: investment.amountInvested,
          start_date: investment.startDate,
          notes: investment.notes,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('[SupabaseBackupRepository.importAll investment]', error);
        summary.skipped++;
        continue;
      }
      investmentIdMap.set(investment.id, data.id);
      summary.investments++;
    }

    for (const valuation of bundle.investmentValuations) {
      const newInvestmentId = investmentIdMap.get(valuation.investmentId);
      if (!newInvestmentId) {
        summary.skipped++;
        continue;
      }
      const { error } = await this.client
        .from('investment_valuations')
        .upsert(
          { investment_id: newInvestmentId, value: valuation.value, valuation_date: valuation.valuationDate },
          { onConflict: 'investment_id,valuation_date' }
        );

      if (error) {
        console.error('[SupabaseBackupRepository.importAll investmentValuation]', error);
        summary.skipped++;
        continue;
      }
      summary.investmentValuations++;
    }

    for (const transaction of bundle.transactions) {
      const newAccountId = accountIdMap.get(transaction.accountId);
      if (!newAccountId) {
        summary.skipped++;
        continue;
      }
      const { error } = await this.client.from('transactions').insert({
        user_id: userId,
        account_id: newAccountId,
        category_id: transaction.categoryId ? (categoryIdMap.get(transaction.categoryId) ?? null) : null,
        client_id: transaction.clientId ? (clientIdMap.get(transaction.clientId) ?? null) : null,
        type: transaction.type as 'income' | 'expense' | 'transfer',
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        notes: transaction.notes,
        transaction_date: transaction.transactionDate,
      });

      if (error) {
        console.error('[SupabaseBackupRepository.importAll transaction]', error);
        summary.skipped++;
        continue;
      }
      summary.transactions++;
    }

    return summary;
  }
}
