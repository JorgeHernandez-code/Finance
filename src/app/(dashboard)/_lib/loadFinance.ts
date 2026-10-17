import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseFinancialSnapshotRepository } from '@/infrastructure/supabase/repositories/SupabaseFinancialSnapshotRepository';
import { SupabaseProgressRepository } from '@/infrastructure/supabase/repositories/SupabaseProgressRepository';
import { SyncProgress, type SyncResult } from '@/application/use-cases/progress/SyncProgress';

/**
 * Carga los datos reales del usuario y sincroniza su progreso (XP de retos
 * y logros cumplidos, historial del índice). Idempotente: se puede llamar en
 * cada render de página sin duplicar nada.
 */
export async function loadFinance(): Promise<SyncResult & { userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const snapshot = await new SupabaseFinancialSnapshotRepository(supabase).load(user.id);
  const result = await new SyncProgress(new SupabaseProgressRepository(supabase)).execute(user.id, snapshot);
  return { ...result, userId: user.id };
}
