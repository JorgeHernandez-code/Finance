'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/infrastructure/supabase/server';
import { num } from '@/infrastructure/supabase/mappers';

const schema = z.object({
  accountId: z.string().uuid(),
  statementBalance: z.coerce.number().finite(),
  reconciledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).nullable().optional(),
});

/**
 * Registra el saldo real que muestra el banco/billetera y la diferencia con
 * el saldo calculado. NO ajusta el saldo ni crea movimientos: si hay
 * diferencia, el usuario decide qué movimiento falta registrar.
 */
export async function reconcileAccountAction(
  input: z.input<typeof schema>
): Promise<{ error?: string; difference?: number }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado.' };

  // El saldo calculado se lee del servidor, no del cliente.
  const { data: balance } = await supabase
    .from('v_account_balances')
    .select('current_balance')
    .eq('account_id', parsed.data.accountId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!balance) return { error: 'Cuenta no encontrada.' };
  const computed = num(balance.current_balance);

  const { error } = await supabase.from('account_reconciliations').insert({
    user_id: user.id,
    account_id: parsed.data.accountId,
    reconciled_on: parsed.data.reconciledOn,
    statement_balance: parsed.data.statementBalance,
    computed_balance: computed,
    notes: parsed.data.notes ?? null,
  });
  if (error) {
    console.error('[reconcileAccountAction]', error.code);
    return { error: 'No se pudo registrar la conciliación.' };
  }
  for (const path of ['/accounts', '/dashboard', '/net-worth', '/plan', '/progress'] as const)
    revalidatePath(path);
  return { difference: Math.round((parsed.data.statementBalance - computed) * 100) / 100 };
}
