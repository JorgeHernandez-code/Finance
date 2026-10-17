'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/infrastructure/supabase/server';
import { CURRENCIES } from '@/shared/config/currencies';

const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado.');
  return { supabase, userId: user.id };
}

function revalidateMoneyViews() {
  for (const path of ['/settings', '/dashboard', '/net-worth', '/debts'] as const) revalidatePath(path);
}

const rateSchema = z
  .object({
    baseCurrency: z.enum(CURRENCY_CODES),
    quoteCurrency: z.enum(CURRENCY_CODES),
    rate: z.coerce.number().positive('La tasa debe ser mayor a 0'),
    rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    source: z.string().trim().max(100).nullable().optional(),
  })
  .refine((v) => v.baseCurrency !== v.quoteCurrency, { message: 'Elige dos monedas distintas' });

/**
 * Tasa ingresada por el usuario (p. ej. la de su banco o casa de cambio).
 * Finance no consulta proveedores externos: así ningún dato sale de la app.
 */
export async function saveExchangeRateAction(
  input: z.input<typeof rateSchema>
): Promise<{ error?: string; success?: boolean }> {
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  try {
    const { supabase, userId } = await requireUser();
    const { error } = await supabase.from('exchange_rates').upsert(
      {
        user_id: userId,
        base_currency: parsed.data.baseCurrency,
        quote_currency: parsed.data.quoteCurrency,
        rate: parsed.data.rate,
        rate_date: parsed.data.rateDate,
        source: parsed.data.source ?? null,
      },
      { onConflict: 'user_id,base_currency,quote_currency,rate_date' }
    );
    if (error) throw new Error('No se pudo guardar la tasa.');
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar la tasa.' };
  }
  revalidateMoneyViews();
  return { success: true };
}

export async function deleteExchangeRateAction(id: string): Promise<{ error?: string; success?: boolean }> {
  if (!z.string().uuid().safeParse(id).success) return { error: 'Id inválido.' };
  try {
    const { supabase, userId } = await requireUser();
    const { error } = await supabase.from('exchange_rates').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new Error('No se pudo eliminar la tasa.');
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la tasa.' };
  }
  revalidateMoneyViews();
  return { success: true };
}

export async function saveRiskToleranceAction(
  value: string | null
): Promise<{ error?: string; success?: boolean }> {
  const parsed = z.enum(['low', 'medium', 'high']).nullable().safeParse(value);
  if (!parsed.success) return { error: 'Valor inválido.' };
  try {
    const { supabase, userId } = await requireUser();
    const { error } = await supabase
      .from('profiles')
      .update({ risk_tolerance: parsed.data })
      .eq('id', userId);
    if (error) throw new Error('No se pudo guardar.');
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar.' };
  }
  revalidatePath('/settings');
  revalidatePath('/plan');
  return { success: true };
}
