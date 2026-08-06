import type { SupabaseClient } from '@supabase/supabase-js';
import { format, startOfMonth, subMonths } from 'date-fns';
import type { Database } from '@/shared/types/database';
import type { IDashboardRepository } from '@/domain/repositories/IDashboardRepository';
import type { CategoryBreakdownItem, MonthlyPoint, NetWorthSummary } from '@/domain/entities/DashboardSummary';

export class SupabaseDashboardRepository implements IDashboardRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getNetWorth(userId: string): Promise<NetWorthSummary | null> {
    const { data, error } = await this.client.from('v_net_worth').select('*').eq('user_id', userId).maybeSingle();
    if (error) {
      console.error('[SupabaseDashboardRepository.getNetWorth]', error);
      throw new Error(`No se pudo cargar el patrimonio neto: ${error.message}`);
    }
    if (!data) return null;
    return { available: data.available, invested: data.invested, saved: data.saved, debt: data.debt, netWorth: data.net_worth };
  }

  async getMonthlyHistory(userId: string, months: number): Promise<MonthlyPoint[]> {
    const rangeStart = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd');

    const { data, error } = await this.client
      .from('v_monthly_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('month', rangeStart)
      .order('month', { ascending: true });

    if (error) {
      console.error('[SupabaseDashboardRepository.getMonthlyHistory]', error);
      throw new Error(`No se pudo cargar el historial mensual: ${error.message}`);
    }

    const byMonth = new Map((data ?? []).map((row) => [row.month, row]));

    // Se rellenan los meses sin movimientos con 0 — así el gráfico siempre
    // muestra `months` puntos, aunque la cuenta sea nueva.
    return Array.from({ length: months }, (_, i) => {
      const monthKey = format(startOfMonth(subMonths(new Date(), months - 1 - i)), 'yyyy-MM-dd');
      const row = byMonth.get(monthKey);
      return { month: monthKey, income: row?.total_income ?? 0, expense: row?.total_expense ?? 0 };
    });
  }

  async getCategoryBreakdown(userId: string, monthStart: string): Promise<CategoryBreakdownItem[]> {
    const { data, error } = await this.client
      .from('v_category_breakdown')
      .select('*')
      .eq('user_id', userId)
      .eq('month', monthStart)
      .eq('category_type', 'expense')
      .order('total_amount', { ascending: false });

    if (error) {
      console.error('[SupabaseDashboardRepository.getCategoryBreakdown]', error);
      throw new Error(`No se pudo cargar el desglose por categoría: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      categoryId: row.category_id,
      name: row.category_name,
      color: row.category_color,
      total: row.total_amount,
    }));
  }
}
