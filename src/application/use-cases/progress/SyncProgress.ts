import { periodFor, previousPeriod } from '@/shared/lib/dates';
import {
  computeHealthScore,
  type HealthScore,
  type StoredHealthSnapshot,
} from '@/domain/finance/healthScore';
import { pendingXp } from '@/domain/finance/progress';
import type { FinancialSnapshot } from '@/domain/finance/snapshot';
import type { SupabaseProgressRepository } from '@/infrastructure/supabase/repositories/SupabaseProgressRepository';

export interface SyncResult {
  snapshot: FinancialSnapshot;
  weekly: HealthScore;
  monthly: HealthScore;
  history: StoredHealthSnapshot[];
  /** XP otorgado en esta sincronización (para celebrar). */
  newlyGranted: number;
}

/**
 * Idempotente. 1) Registra XP de retos y logros cumplidos (una vez cada uno).
 * 2) Guarda el índice del periodo en curso (abierto) y cierra el anterior
 * si aún no estaba cerrado. Los periodos cerrados no se recalculan.
 */
export class SyncProgress {
  constructor(private readonly progressRepository: SupabaseProgressRepository) {}

  async execute(userId: string, snapshot: FinancialSnapshot): Promise<SyncResult> {
    const pending = pendingXp(snapshot);
    await this.progressRepository.grantXp(userId, pending);
    const now = new Date().toISOString();
    const updated: FinancialSnapshot = {
      ...snapshot,
      xpEvents: [...snapshot.xpEvents, ...pending.map((p) => ({ ...p, earnedAt: now }))],
    };

    const history = await this.progressRepository.listHealthSnapshots(userId);
    const stored = new Map(history.map((h) => [`${h.periodType}|${h.periodStart}`, h]));

    const weekly = computeHealthScore(updated, periodFor('week', snapshot.today));
    const monthly = computeHealthScore(updated, periodFor('month', snapshot.today));
    await this.progressRepository.saveHealthSnapshot(userId, weekly, false);
    await this.progressRepository.saveHealthSnapshot(userId, monthly, false);

    for (const current of [weekly.period, monthly.period]) {
      const prev = previousPeriod(current);
      const existing = stored.get(`${prev.type}|${prev.start}`);
      if (!existing?.isFinal) {
        await this.progressRepository.saveHealthSnapshot(userId, computeHealthScore(updated, prev), true);
      }
    }

    return {
      snapshot: updated,
      weekly,
      monthly,
      history: await this.progressRepository.listHealthSnapshots(userId),
      newlyGranted: pending.reduce((s, p) => s + p.points, 0),
    };
  }
}
