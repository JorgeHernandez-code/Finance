'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseSavingsGoalRepository } from '@/infrastructure/supabase/repositories/SupabaseSavingsGoalRepository';
import { CreateSavingsGoal } from '@/application/use-cases/savings/CreateSavingsGoal';
import { UpdateSavingsGoal } from '@/application/use-cases/savings/UpdateSavingsGoal';
import { DeleteSavingsGoal } from '@/application/use-cases/savings/DeleteSavingsGoal';
import { AddSavingsContribution } from '@/application/use-cases/savings/AddSavingsContribution';
import { SetSavingsGoalStatus } from '@/application/use-cases/savings/SetSavingsGoalStatus';
import type {
  SavingsGoalInputDto,
  UpdateSavingsGoalInput,
  SavingsContributionInputDto,
} from '@/application/dto/savingsGoal';

export interface SavingsGoalActionResult {
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

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  return error instanceof Error ? error.message : fallback;
}

function revalidateSavings() {
  for (const path of ['/savings', '/dashboard', '/net-worth', '/plan', '/progress'] as const)
    revalidatePath(path);
}

async function run(
  fallback: string,
  fn: (ctx: Awaited<ReturnType<typeof requireUserId>>) => Promise<void>
): Promise<SavingsGoalActionResult> {
  try {
    await fn(await requireUserId());
  } catch (error) {
    return { error: errorMessage(error, fallback) };
  }
  revalidateSavings();
  return { success: true };
}

export async function createSavingsGoalAction(input: SavingsGoalInputDto): Promise<SavingsGoalActionResult> {
  return run('No se pudo crear la meta de ahorro.', ({ supabase, userId }) =>
    new CreateSavingsGoal(new SupabaseSavingsGoalRepository(supabase)).execute(userId, input)
  );
}

export async function updateSavingsGoalAction(
  input: UpdateSavingsGoalInput
): Promise<SavingsGoalActionResult> {
  return run('No se pudo actualizar la meta de ahorro.', ({ supabase, userId }) =>
    new UpdateSavingsGoal(new SupabaseSavingsGoalRepository(supabase)).execute(userId, input)
  );
}

export async function setSavingsGoalStatusAction(
  id: string,
  status: string
): Promise<SavingsGoalActionResult> {
  return run('No se pudo cambiar el estado de la meta.', ({ supabase, userId }) =>
    new SetSavingsGoalStatus(new SupabaseSavingsGoalRepository(supabase)).execute(userId, { id, status })
  );
}

export async function deleteSavingsGoalAction(id: string): Promise<SavingsGoalActionResult> {
  return run('No se pudo eliminar la meta de ahorro.', ({ supabase, userId }) =>
    new DeleteSavingsGoal(new SupabaseSavingsGoalRepository(supabase)).execute(userId, id)
  );
}

export async function addSavingsContributionAction(
  input: SavingsContributionInputDto
): Promise<SavingsGoalActionResult> {
  return run('No se pudo registrar el aporte.', ({ supabase, userId }) =>
    new AddSavingsContribution(new SupabaseSavingsGoalRepository(supabase)).execute(userId, input)
  );
}
