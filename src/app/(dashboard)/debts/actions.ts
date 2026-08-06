'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseDebtRepository } from '@/infrastructure/supabase/repositories/SupabaseDebtRepository';
import { CreateDebt } from '@/application/use-cases/debts/CreateDebt';
import { UpdateDebt } from '@/application/use-cases/debts/UpdateDebt';
import { DeleteDebt } from '@/application/use-cases/debts/DeleteDebt';
import { AddDebtPayment } from '@/application/use-cases/debts/AddDebtPayment';
import type { DebtInputDto, UpdateDebtInput, DebtPaymentInputDto } from '@/application/dto/debt';

export interface DebtActionResult {
  error?: string;
  success?: boolean;
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado.');
  return { supabase, userId: user.id };
}

export async function createDebtAction(input: DebtInputDto): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateDebt(new SupabaseDebtRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la deuda.' };
  }
  revalidatePath('/debts');
  return { success: true };
}

export async function updateDebtAction(input: UpdateDebtInput): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateDebt(new SupabaseDebtRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la deuda.' };
  }
  revalidatePath('/debts');
  return { success: true };
}

export async function deleteDebtAction(id: string): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteDebt(new SupabaseDebtRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la deuda.' };
  }
  revalidatePath('/debts');
  return { success: true };
}

export async function addDebtPaymentAction(input: DebtPaymentInputDto): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new AddDebtPayment(new SupabaseDebtRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el abono.' };
  }
  revalidatePath('/debts');
  return { success: true };
}
