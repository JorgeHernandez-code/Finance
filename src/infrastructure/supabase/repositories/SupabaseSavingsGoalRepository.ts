import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  ISavingsGoalRepository,
  SavingsGoalInput,
  SavingsContributionInput,
} from '@/domain/repositories/ISavingsGoalRepository';
import type { SavingsGoal, SavingsGoalStatus } from '@/domain/entities/SavingsGoal';
import { friendlyDbError, mapGoal, num } from '../mappers';

function toRow(input: SavingsGoalInput) {
  return {
    name: input.name,
    target_amount: input.targetAmount,
    currency: input.currency,
    target_date: input.targetDate ?? null,
    account_id: input.accountId ?? null,
    priority: input.priority,
    planned_monthly_contribution: input.plannedMonthlyContribution ?? null,
    is_emergency_fund: input.isEmergencyFund,
    icon: input.icon,
    color: input.color,
    status: input.status,
  };
}

export class SupabaseSavingsGoalRepository implements ISavingsGoalRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: string): Promise<SavingsGoal[]> {
    const [goalsRes, progressRes] = await Promise.all([
      this.client
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('priority')
        .order('target_date'),
      this.client.from('v_savings_progress').select('*').eq('user_id', userId),
    ]);

    if (goalsRes.error || progressRes.error) {
      console.error('[SupabaseSavingsGoalRepository.list]', goalsRes.error?.code ?? progressRes.error?.code);
      throw new Error('No se pudieron cargar las metas de ahorro.');
    }

    const progressByGoal = new Map((progressRes.data ?? []).map((row) => [row.goal_id, row]));
    return (goalsRes.data ?? []).map((row) => {
      const progress = progressByGoal.get(row.id);
      return {
        ...mapGoal(row, progress),
        icon: row.icon,
        color: row.color,
        progressPercent: num(progress?.progress_percent),
        notes: row.notes ?? null,
      };
    });
  }

  async create(userId: string, input: SavingsGoalInput): Promise<void> {
    const { error } = await this.client.from('savings_goals').insert({ user_id: userId, ...toRow(input) });
    if (error) {
      console.error('[SupabaseSavingsGoalRepository.create]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo crear la meta de ahorro.'));
    }
  }

  async update(userId: string, id: string, input: SavingsGoalInput): Promise<void> {
    const { error } = await this.client
      .from('savings_goals')
      .update(toRow(input))
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      console.error('[SupabaseSavingsGoalRepository.update]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo actualizar la meta de ahorro.'));
    }
  }

  async setStatus(userId: string, id: string, status: SavingsGoalStatus): Promise<void> {
    const { error } = await this.client
      .from('savings_goals')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new Error(friendlyDbError(error.message, 'No se pudo cambiar el estado de la meta.'));
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('savings_goals').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      console.error('[SupabaseSavingsGoalRepository.delete]', error.code);
      throw new Error('No se pudo eliminar la meta de ahorro.');
    }
  }

  async addContribution(userId: string, goalId: string, input: SavingsContributionInput): Promise<void> {
    const { data: owner } = await this.client
      .from('savings_goals')
      .select('id')
      .eq('id', goalId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!owner) throw new Error('Meta no encontrada.');
    const { error } = await this.client.from('savings_contributions').insert({
      savings_goal_id: goalId,
      amount: input.amount,
      kind: input.kind,
      contribution_date: input.contributionDate,
      notes: input.notes ?? null,
      idempotency_key: input.idempotencyKey,
    });
    // Reintento del mismo envío: ya está registrado, no es un error para el usuario.
    if (error && /duplicate key|unique/i.test(error.message)) return;
    if (error) {
      console.error('[SupabaseSavingsGoalRepository.addContribution]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo registrar el movimiento.'));
    }
  }
}
