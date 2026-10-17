'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseTransactionRepository } from '@/infrastructure/supabase/repositories/SupabaseTransactionRepository';
import { CreateTransaction } from '@/application/use-cases/transactions/CreateTransaction';
import { UpdateTransaction } from '@/application/use-cases/transactions/UpdateTransaction';
import { DeleteTransaction } from '@/application/use-cases/transactions/DeleteTransaction';
import { z } from 'zod';
import {
  transferInputSchema,
  type CreateTransactionInput,
  type TransferInputDto,
  type UpdateTransactionInput,
} from '@/application/dto/transaction';

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
export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<TransactionActionResult> {
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

export async function updateTransactionAction(
  input: UpdateTransactionInput
): Promise<TransactionActionResult> {
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

/** Transferencia entre cuentas propias: dos movimientos enlazados, creados de forma atómica. */
export async function createTransferAction(input: TransferInputDto): Promise<TransactionActionResult> {
  try {
    const parsed = transferInputSchema.parse(input);
    const { supabase } = await requireUserId();
    await new SupabaseTransactionRepository(supabase).createTransfer(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? 'Datos inválidos.' };
    return { error: error instanceof Error ? error.message : 'No se pudo registrar la transferencia.' };
  }

  for (const path of ['/transactions', '/dashboard', '/accounts', '/net-worth'] as const)
    revalidatePath(path);
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
