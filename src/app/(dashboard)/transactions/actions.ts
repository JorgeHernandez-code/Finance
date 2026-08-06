'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseTransactionRepository } from '@/infrastructure/supabase/repositories/SupabaseTransactionRepository';
import { CreateTransaction } from '@/application/use-cases/transactions/CreateTransaction';
import { UpdateTransaction } from '@/application/use-cases/transactions/UpdateTransaction';
import { DeleteTransaction } from '@/application/use-cases/transactions/DeleteTransaction';
import type { CreateTransactionInput, UpdateTransactionInput } from '@/application/dto/transaction';

export interface TransactionActionResult {
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

/**
 * Cada acción revalida /transactions (la lista) y /dashboard (los KPIs y
 * gráficos dependen de las mismas filas) — así el usuario nunca ve datos
 * desactualizados al volver a cualquiera de las dos pantallas.
 */
export async function createTransactionAction(input: CreateTransactionInput): Promise<TransactionActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const useCase = new CreateTransaction(new SupabaseTransactionRepository(supabase));
    await useCase.execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la transacción.' };
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateTransactionAction(input: UpdateTransactionInput): Promise<TransactionActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const useCase = new UpdateTransaction(new SupabaseTransactionRepository(supabase));
    await useCase.execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la transacción.' };
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTransactionAction(id: string): Promise<TransactionActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const useCase = new DeleteTransaction(new SupabaseTransactionRepository(supabase));
    await useCase.execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la transacción.' };
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { success: true };
}
