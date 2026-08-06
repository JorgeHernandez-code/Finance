import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ISearchRepository } from '@/domain/repositories/ISearchRepository';
import type { SearchResult } from '@/domain/entities/SearchResult';
import { formatMoney } from '@/shared/lib/format';

const RESULTS_PER_TABLE = 5;

export class SupabaseSearchRepository implements ISearchRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async search(userId: string, query: string): Promise<SearchResult[]> {
    const term = `%${query}%`;

    const [transactions, accounts, categories, clients, debts, savingsGoals, investments, subscriptions] = await Promise.all([
      this.client
        .from('transactions')
        .select('id, description, amount, transaction_date')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .ilike('description', term)
        .order('transaction_date', { ascending: false })
        .limit(RESULTS_PER_TABLE),
      this.client.from('accounts').select('id, name, institution').eq('user_id', userId).ilike('name', term).limit(RESULTS_PER_TABLE),
      this.client.from('categories').select('id, name, type').eq('user_id', userId).ilike('name', term).limit(RESULTS_PER_TABLE),
      this.client.from('clients').select('id, name, status').eq('user_id', userId).ilike('name', term).limit(RESULTS_PER_TABLE),
      this.client
        .from('debts')
        .select('id, creditor_name, principal_amount')
        .eq('user_id', userId)
        .ilike('creditor_name', term)
        .limit(RESULTS_PER_TABLE),
      this.client
        .from('savings_goals')
        .select('id, name, target_amount')
        .eq('user_id', userId)
        .ilike('name', term)
        .limit(RESULTS_PER_TABLE),
      this.client
        .from('investments')
        .select('id, name, amount_invested')
        .eq('user_id', userId)
        .ilike('name', term)
        .limit(RESULTS_PER_TABLE),
      this.client
        .from('subscriptions')
        .select('id, name, amount')
        .eq('user_id', userId)
        .ilike('name', term)
        .limit(RESULTS_PER_TABLE),
    ]);

    const results: SearchResult[] = [];

    for (const row of transactions.data ?? []) {
      results.push({
        id: row.id,
        type: 'transaction',
        title: row.description,
        subtitle: `${formatMoney(row.amount)} · ${row.transaction_date}`,
        href: '/transactions',
      });
    }
    for (const row of accounts.data ?? []) {
      results.push({ id: row.id, type: 'account', title: row.name, subtitle: row.institution, href: '/accounts' });
    }
    for (const row of categories.data ?? []) {
      results.push({
        id: row.id,
        type: 'category',
        title: row.name,
        subtitle: row.type === 'income' ? 'Ingreso' : 'Gasto',
        href: '/categories',
      });
    }
    for (const row of clients.data ?? []) {
      results.push({
        id: row.id,
        type: 'client',
        title: row.name,
        subtitle: row.status === 'active' ? 'Activo' : 'Inactivo',
        href: '/clients',
      });
    }
    for (const row of debts.data ?? []) {
      results.push({
        id: row.id,
        type: 'debt',
        title: row.creditor_name,
        subtitle: formatMoney(row.principal_amount),
        href: '/debts',
      });
    }
    for (const row of savingsGoals.data ?? []) {
      results.push({
        id: row.id,
        type: 'savings_goal',
        title: row.name,
        subtitle: formatMoney(row.target_amount),
        href: '/savings',
      });
    }
    for (const row of investments.data ?? []) {
      results.push({
        id: row.id,
        type: 'investment',
        title: row.name,
        subtitle: formatMoney(row.amount_invested),
        href: '/investments',
      });
    }
    for (const row of subscriptions.data ?? []) {
      results.push({
        id: row.id,
        type: 'subscription',
        title: row.name,
        subtitle: formatMoney(row.amount),
        href: '/subscriptions',
      });
    }

    return results;
  }
}
