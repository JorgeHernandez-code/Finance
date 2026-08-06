import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ISavingsGoalRepository, SavingsGoalInput, SavingsContributionInput } from '@/domain/repositories/ISavingsGoalRepository';
import type { SavingsGoal } from '@/domain/entities/SavingsGoal';

interface RawGoalRow {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  icon: string;
  color: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
}

interface ProgressRow {
  current_amount: number;
  progress_percent: number | null;
}

function mapRow(row: RawGoalRow, progress?: ProgressRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    targetDate: row.target_date,
    icon: row.icon,
    color: row.color,
    status: row.status,
    currentAmount: progress?.current_amount ?? 0,
    progressPercent: progress?.progress_percent ?? 0,
    createdAt: row.created_at,
  };
}

export class SupabaseSavingsGoalRepository implements ISavingsGoalRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async getProgress(id: string): Promise<ProgressRow | undefined> {
    const { data } = await this.client
      .from('v_savings_progress')
      .select('current_amount, progress_percent')
      .eq('goal_id', id)
      .maybeSingle();
    return data ?? undefined;
  }

  async list(userId: string): Promise<SavingsGoal[]> {
    const [goalsRes, progressRes] = await Promise.all([
      this.client.from('savings_goals').select('*').eq('user_id', userId).order('status').order('target_date'),
      this.client.from('v_savings_progress').select('goal_id, current_amount, progress_percent').eq('user_id', userId),
    ]);

    if (goalsRes.error) {
      console.error('[SupabaseSavingsGoalRepository.list]', goalsRes.error);
      throw new Error(`No se pudieron cargar las metas de ahorro: ${goalsRes.error.message}`);
    }
    if (progressRes.error) {
      console.error('[SupabaseSavingsGoalRepository.list progress]', progressRes.error);
      throw new Error(`No se pudo calcular el progreso de ahorro: ${progressRes.error.message}`);
    }

    const progressByGoal = new Map(
      (progressRes.data ?? []).map((row) => [row.goal_id, { current_amount: row.current_amount, progress_percent: row.progress_percent }])
    );

    return (goalsRes.data ?? []).map((row) => mapRow(row, progressByGoal.get(row.id)));
  }

  async create(userId: string, input: SavingsGoalInput): Promise<SavingsGoal> {
    const { data, error } = await this.client
      .from('savings_goals')
      .insert({
        user_id: userId,
        name: input.name,
        target_amount: input.targetAmount,
        target_date: input.targetDate ?? null,
        icon: input.icon,
        color: input.color,
        status: input.status,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseSavingsGoalRepository.create]', error);
      throw new Error(`No se pudo crear la meta de ahorro: ${error.message}`);
    }

    return mapRow(data);
  }

  async update(userId: string, id: string, input: SavingsGoalInput): Promise<SavingsGoal> {
    const { data, error } = await this.client
      .from('savings_goals')
      .update({
        name: input.name,
        target_amount: input.targetAmount,
        target_date: input.targetDate ?? null,
        icon: input.icon,
        color: input.color,
        status: input.status,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseSavingsGoalRepository.update]', error);
      throw new Error(`No se pudo actualizar la meta de ahorro: ${error.message}`);
    }

    return mapRow(data, await this.getProgress(id));
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('savings_goals').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseSavingsGoalRepository.delete]', error);
      throw new Error(`No se pudo eliminar la meta de ahorro: ${error.message}`);
    }
  }

  async addContribution(userId: string, goalId: string, input: SavingsContributionInput): Promise<SavingsGoal> {
    const { error: contributionError } = await this.client.from('savings_contributions').insert({
      savings_goal_id: goalId,
      amount: input.amount,
      contribution_date: input.contributionDate,
      notes: input.notes ?? null,
    });

    if (contributionError) {
      console.error('[SupabaseSavingsGoalRepository.addContribution]', contributionError);
      throw new Error(`No se pudo registrar el aporte: ${contributionError.message}`);
    }

    const { data, error } = await this.client.from('savings_goals').select('*').eq('id', goalId).eq('user_id', userId).single();

    if (error) {
      console.error('[SupabaseSavingsGoalRepository.addContribution refetch]', error);
      throw new Error(`El aporte se registró, pero no se pudo recargar la meta: ${error.message}`);
    }

    return mapRow(data, await this.getProgress(goalId));
  }
}
