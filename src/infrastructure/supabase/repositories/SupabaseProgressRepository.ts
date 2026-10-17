import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/shared/types/database';
import type { HealthScore, StoredHealthSnapshot } from '@/domain/finance/healthScore';
import type { PendingXp } from '@/domain/finance/progress';

export type XpGrant = Omit<PendingXp, 'sourceType'> & { sourceType: PendingXp['sourceType'] | 'lesson' };
import { friendlyDbError } from '../mappers';

/** Escrituras de check-ins, lecciones, XP e historial del índice. Todo bajo RLS. */
export class SupabaseProgressRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async recordCheckin(
    userId: string,
    actionKey: string,
    periodStart: string,
    notes?: string | null
  ): Promise<void> {
    const { error } = await this.client
      .from('user_checkins')
      .upsert(
        { user_id: userId, action_key: actionKey, period_start: periodStart, notes: notes ?? null },
        { onConflict: 'user_id,action_key,period_start', ignoreDuplicates: true }
      );
    if (error) throw new Error(friendlyDbError(error.message, 'No se pudo registrar la acción.'));
  }

  /** Registra XP pendiente. La restricción única impide cobrar dos veces la misma fuente. */
  async grantXp(userId: string, events: XpGrant[]): Promise<void> {
    if (events.length === 0) return;
    const { error } = await this.client.from('xp_events').upsert(
      events.map((e) => ({
        user_id: userId,
        source_type: e.sourceType,
        source_key: e.sourceKey,
        points: e.points,
        description: e.description,
      })),
      { onConflict: 'user_id,source_type,source_key', ignoreDuplicates: true }
    );
    if (error) {
      console.error('[SupabaseProgressRepository.grantXp]', error.code);
      throw new Error('No se pudo registrar la experiencia.');
    }
  }

  async getLessonProgress(userId: string, lessonId: string) {
    const { data } = await this.client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    return data;
  }

  async saveLessonAttempt(
    userId: string,
    lessonId: string,
    exerciseResponse: string,
    passed: boolean,
    previousAttempts: number
  ): Promise<void> {
    const { error } = await this.client.from('lesson_progress').upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        attempts: previousAttempts + 1,
        exercise_response: exerciseResponse,
        quiz_passed: passed,
        completed_at: passed ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,lesson_id' }
    );
    if (error)
      throw new Error(friendlyDbError(error.message, 'No se pudo guardar el progreso de la lección.'));
  }

  async listHealthSnapshots(userId: string): Promise<StoredHealthSnapshot[]> {
    const { data, error } = await this.client
      .from('health_score_snapshots')
      .select('period_type, period_start, score, confidence, rules_version, is_final, computed_at')
      .eq('user_id', userId)
      .order('period_start', { ascending: true });
    if (error) throw new Error('No se pudo cargar el historial del índice.');
    return (data ?? []).map((r) => ({
      periodType: r.period_type,
      periodStart: r.period_start,
      score: r.score,
      confidence: r.confidence,
      rulesVersion: r.rules_version,
      isFinal: r.is_final,
      computedAt: r.computed_at,
    }));
  }

  /**
   * Guarda el puntaje de un periodo. Si el periodo ya está cerrado
   * (is_final), RLS impide modificarlo: el historial no se reescribe.
   */
  async saveHealthSnapshot(userId: string, score: HealthScore, isFinal: boolean): Promise<void> {
    const components = score.components.map((c) => ({ key: c.key, score: c.score })) as unknown as Json;
    const { error } = await this.client.from('health_score_snapshots').upsert(
      {
        user_id: userId,
        period_type: score.period.type,
        period_start: score.period.start,
        score: score.score,
        confidence: score.confidence,
        components,
        rules_version: score.rulesVersion,
        is_final: isFinal,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,period_type,period_start' }
    );
    // Un periodo ya cerrado devuelve error de RLS en el update: es lo esperado.
    if (error && !/row-level security/i.test(error.message)) {
      console.error('[SupabaseProgressRepository.saveHealthSnapshot]', error.code);
    }
  }
}
