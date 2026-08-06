'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseBudgetRepository } from '@/infrastructure/supabase/repositories/SupabaseBudgetRepository';
import { CreateBudget } from '@/application/use-cases/budgets/CreateBudget';
import { UpdateBudget } from '@/application/use-cases/budgets/UpdateBudget';
import { DeleteBudget } from '@/application/use-cases/budgets/DeleteBudget';
import type { BudgetInputDto, UpdateBudgetInput } from '@/application/dto/budget';

export interface BudgetActionResult {
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

export async function createBudgetAction(input: BudgetInputDto): Promise<BudgetActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateBudget(new SupabaseBudgetRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear el presupuesto.' };
  }
  revalidatePath('/budgets');
  return { success: true };
}

export async function updateBudgetAction(input: UpdateBudgetInput): Promise<BudgetActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateBudget(new SupabaseBudgetRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar el presupuesto.' };
  }
  revalidatePath('/budgets');
  return { success: true };
}

export async function deleteBudgetAction(id: string): Promise<BudgetActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteBudget(new SupabaseBudgetRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar el presupuesto.' };
  }
  revalidatePath('/budgets');
  return { success: true };
}
