'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseSavingsGoalRepository } from '@/infrastructure/supabase/repositories/SupabaseSavingsGoalRepository';
import { CreateSavingsGoal } from '@/application/use-cases/savings/CreateSavingsGoal';
import { UpdateSavingsGoal } from '@/application/use-cases/savings/UpdateSavingsGoal';
import { DeleteSavingsGoal } from '@/application/use-cases/savings/DeleteSavingsGoal';
import { AddSavingsContribution } from '@/application/use-cases/savings/AddSavingsContribution';
import type { SavingsGoalInputDto, UpdateSavingsGoalInput, SavingsContributionInputDto } from '@/application/dto/savingsGoal';

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

export async function createSavingsGoalAction(input: SavingsGoalInputDto): Promise<SavingsGoalActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateSavingsGoal(new SupabaseSavingsGoalRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la meta de ahorro.' };
  }
  revalidatePath('/savings');
  return { success: true };
}

export async function updateSavingsGoalAction(input: UpdateSavingsGoalInput): Promise<SavingsGoalActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateSavingsGoal(new SupabaseSavingsGoalRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la meta de ahorro.' };
  }
  revalidatePath('/savings');
  return { success: true };
}

export async function deleteSavingsGoalAction(id: string): Promise<SavingsGoalActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteSavingsGoal(new SupabaseSavingsGoalRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la meta de ahorro.' };
  }
  revalidatePath('/savings');
  return { success: true };
}

export async function addSavingsContributionAction(input: SavingsContributionInputDto): Promise<SavingsGoalActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new AddSavingsContribution(new SupabaseSavingsGoalRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el aporte.' };
  }
  revalidatePath('/savings');
  return { success: true };
}
