import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IReportRepository } from '@/domain/repositories/IReportRepository';
import type { AccountBreakdownItem, ReportSummary, ReportTransactionRow } from '@/domain/entities/Report';
import type { MonthlyPoint } from '@/domain/entities/DashboardSummary';

const EXPORT_SELECT =
  'transaction_date, type, description, amount, accounts:account_id(name), categories:category_id(name), clients:client_id(name)';

interface RawExportRow {
  transaction_date: string;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  amount: number;
  accounts: { name: string } | null;
  categories: { name: string } | null;
  clients: { name: string } | null;
}

function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export class SupabaseReportRepository implements IReportRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getYearlySummary(userId: string, year: number): Promise<ReportSummary> {
    const { from, to } = yearRange(year);

    const [monthlyRes, categoryRes, accountsRes] = await Promise.all([
      this.client.from('v_monthly_summary').select('*').eq('user_id', userId).gte('month', from).lte('month', to).order('month'),
      this.client
        .from('v_category_breakdown')
        .select('*')
        .eq('user_id', userId)
        .eq('category_type', 'expense')
        .gte('month', from)
        .lte('month', to),
      this.client
        .from('transactions')
        .select('account_id, type, amount, accounts:account_id(name)')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('transaction_date', from)
        .lte('transaction_date', to),
    ]);

    if (monthlyRes.error) {
      console.error('[SupabaseReportRepository.getYearlySummary monthly]', monthlyRes.error);
      throw new Error(`No se pudo cargar el resumen mensual: ${monthlyRes.error.message}`);
    }
    if (categoryRes.error) {
      console.error('[SupabaseReportRepository.getYearlySummary category]', categoryRes.error);
      throw new Error(`No se pudo cargar el desglose por categoría: ${categoryRes.error.message}`);
    }
    if (accountsRes.error) {
      console.error('[SupabaseReportRepository.getYearlySummary accounts]', accountsRes.error);
      throw new Error(`No se pudo cargar el desglose por cuenta: ${accountsRes.error.message}`);
    }

    // Se rellenan los 12 meses del año, aunque no tengan movimientos, para
    // que el gráfico siempre muestre el año completo.
    const byMonth = new Map((monthlyRes.data ?? []).map((row) => [row.month, row]));
    const monthlySeries: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}-01`;
      const row = byMonth.get(monthKey);
      return { month: monthKey, income: row?.total_income ?? 0, expense: row?.total_expense ?? 0 };
    });

    const totalIncome = monthlySeries.reduce((sum, m) => sum + m.income, 0);
    const totalExpense = monthlySeries.reduce((sum, m) => sum + m.expense, 0);

    // v_category_breakdown viene por mes: se suma por categoría en todo el año.
    const categoryTotals = new Map<string, { name: string; color: string; total: number }>();
    for (const row of categoryRes.data ?? []) {
      const existing = categoryTotals.get(row.category_id);
      if (existing) {
        existing.total += row.total_amount;
      } else {
        categoryTotals.set(row.category_id, { name: row.category_name, color: row.category_color, total: row.total_amount });
      }
    }
    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([categoryId, value]) => ({ categoryId, name: value.name, color: value.color, total: value.total }))
      .sort((a, b) => b.total - a.total);

    // Sin vista dedicada para "por cuenta en un rango" (v_account_balances es
    // saldo acumulado, no por periodo) — se agrega en memoria desde transactions.
    const accountTotals = new Map<string, AccountBreakdownItem>();
    for (const row of accountsRes.data ?? []) {
      const raw = row as unknown as { account_id: string; type: 'income' | 'expense' | 'transfer'; amount: number; accounts: { name: string } | null };
      if (raw.type !== 'income' && raw.type !== 'expense') continue;
      const existing = accountTotals.get(raw.account_id) ?? {
        accountId: raw.account_id,
        name: raw.accounts?.name ?? '—',
        income: 0,
        expense: 0,
        balance: 0,
      };
      if (raw.type === 'income') existing.income += raw.amount;
      else existing.expense += raw.amount;
      existing.balance = existing.income - existing.expense;
      accountTotals.set(raw.account_id, existing);
    }
    const accountBreakdown = Array.from(accountTotals.values()).sort((a, b) => b.income + b.expense - (a.income + a.expense));

    return {
      year,
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
      monthlySeries,
      categoryBreakdown,
      accountBreakdown,
    };
  }

  async getTransactionsForExport(userId: string, year: number): Promise<ReportTransactionRow[]> {
    const { from, to } = yearRange(year);

    const { data, error } = await this.client
      .from('transactions')
      .select(EXPORT_SELECT)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error('[SupabaseReportRepository.getTransactionsForExport]', error);
      throw new Error(`No se pudieron cargar las transacciones para exportar: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as RawExportRow[];
    return rows
      .filter((row) => row.type !== 'transfer')
      .map((row) => ({
        date: row.transaction_date,
        type: row.type as 'income' | 'expense',
        description: row.description,
        categoryName: row.categories?.name ?? null,
        accountName: row.accounts?.name ?? '—',
        clientName: row.clients?.name ?? null,
        amount: row.amount,
      }));
  }
}
