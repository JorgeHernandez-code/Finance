'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseProgressRepository } from '@/infrastructure/supabase/repositories/SupabaseProgressRepository';
import { checkinPeriodStart, isCheckinKey } from '@/domain/finance/checkins';
import { todayIso } from '@/shared/lib/dates';

export interface CheckinResult {
  error?: string;
  success?: boolean;
}

/** Registra una acción confirmada por el usuario (revisión semanal, cierre mensual…). Idempotente por periodo. */
export async function recordCheckinAction(actionKey: string, notes?: string): Promise<CheckinResult> {
  if (!isCheckinKey(actionKey)) return { error: 'Acción no válida.' };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado.' };
    await new SupabaseProgressRepository(supabase).recordCheckin(
      user.id,
      actionKey,
      checkinPeriodStart(actionKey, todayIso()),
      notes?.slice(0, 1000) ?? null
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar.' };
  }
  for (const path of ['/dashboard', '/plan', '/progress', '/debts'] as const) revalidatePath(path);
  return { success: true };
}
