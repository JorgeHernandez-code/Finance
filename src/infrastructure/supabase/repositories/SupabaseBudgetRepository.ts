import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IBudgetRepository, BudgetInput } from '@/domain/repositories/IBudgetRepository';
import type { Budget } from '@/domain/entities/Budget';

const SELECT_WITH_CATEGORY =
  'id, category_id, amount, period, start_date, end_date, alert_threshold_percent, created_at, categories:category_id(name, color, icon)';

interface RawBudgetRow {
  id: string;
  category_id: string;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  alert_threshold_percent: number;
  created_at: string;
  categories: { name: string; color: string; icon: string } | null;
}

interface ProgressRow {
  spent_amount: number;
  available_amount: number;
  spent_percent: number | null;
}

function mapRow(row: RawBudgetRow, progress?: ProgressRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? '—',
    categoryColor: row.categories?.color ?? '#64748b',
    categoryIcon: row.categories?.icon ?? 'tag',
    amount: row.amount,
    period: row.period,
    startDate: row.start_date,
    endDate: row.end_date,
    alertThresholdPercent: row.alert_threshold_percent,
    spentAmount: progress?.spent_amount ?? 0,
    availableAmount: progress?.available_amount ?? row.amount,
    spentPercent: progress?.spent_percent ?? 0,
    createdAt: row.created_at,
  };
}

export class SupabaseBudgetRepository implements IBudgetRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: string): Promise<Budget[]> {
    const [budgetsRes, progressRes] = await Promise.all([
      this.client.from('budgets').select(SELECT_WITH_CATEGORY).eq('user_id', userId).order('created_at', { ascending: false }),
      this.client
        .from('v_budget_progress')
        .select('budget_id, spent_amount, available_amount, spent_percent')
        .eq('user_id', userId),
    ]);

    if (budgetsRes.error) {
      console.error('[SupabaseBudgetRepository.list]', budgetsRes.error);
      throw new Error(`No se pudieron cargar los presupuestos: ${budgetsRes.error.message}`);
    }
    if (progressRes.error) {
      console.error('[SupabaseBudgetRepository.list progress]', progressRes.error);
      throw new Error(`No se pudo calcular el progreso de los presupuestos: ${progressRes.error.message}`);
    }

    const progressByBudget = new Map(
      (progressRes.data ?? []).map((row) => [
        row.budget_id,
        { spent_amount: row.spent_amount, available_amount: row.available_amount, spent_percent: row.spent_percent },
      ])
    );

    return ((budgetsRes.data ?? []) as unknown as RawBudgetRow[]).map((row) => mapRow(row, progressByBudget.get(row.id)));
  }

  async create(userId: string, input: BudgetInput): Promise<Budget> {
    const { data, error } = await this.client
      .from('budgets')
      .insert({
        user_id: userId,
        category_id: input.categoryId,
        amount: input.amount,
        period: input.period,
        start_date: input.startDate,
        end_date: input.endDate ?? null,
        alert_threshold_percent: input.alertThresholdPercent,
      })
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) {
      console.error('[SupabaseBudgetRepository.create]', error);
      throw new Error(`No se pudo crear el presupuesto: ${error.message}`);
    }

    return mapRow(data as unknown as RawBudgetRow);
  }

  async update(userId: string, id: string, input: BudgetInput): Promise<Budget> {
    const { data, error } = await this.client
      .from('budgets')
      .update({
        category_id: input.categoryId,
        amount: input.amount,
        period: input.period,
        start_date: input.startDate,
        end_date: input.endDate ?? null,
        alert_threshold_percent: input.alertThresholdPercent,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) {
      console.error('[SupabaseBudgetRepository.update]', error);
      throw new Error(`No se pudo actualizar el presupuesto: ${error.message}`);
    }

    const { data: progressRow } = await this.client
      .from('v_budget_progress')
      .select('spent_amount, available_amount, spent_percent')
      .eq('budget_id', id)
      .maybeSingle();

    return mapRow(data as unknown as RawBudgetRow, progressRow ?? undefined);
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('budgets').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseBudgetRepository.delete]', error);
      throw new Error(`No se pudo eliminar el presupuesto: ${error.message}`);
    }
  }
}
