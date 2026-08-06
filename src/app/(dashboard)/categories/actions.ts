'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseCategoryRepository } from '@/infrastructure/supabase/repositories/SupabaseCategoryRepository';
import { CreateCategory } from '@/application/use-cases/categories/CreateCategory';
import { UpdateCategory } from '@/application/use-cases/categories/UpdateCategory';
import { DeleteCategory } from '@/application/use-cases/categories/DeleteCategory';
import { CountCategoryBudgets } from '@/application/use-cases/categories/CountCategoryBudgets';
import type { CategoryInputDto, UpdateCategoryInput } from '@/application/dto/category';

export interface CategoryActionResult {
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

export async function createCategoryAction(input: CategoryInputDto): Promise<CategoryActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const useCase = new CreateCategory(new SupabaseCategoryRepository(supabase));
    await useCase.execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la categoría.' };
  }

  revalidatePath('/categories');
  revalidatePath('/transactions');
  return { success: true };
}

export async function updateCategoryAction(input: UpdateCategoryInput): Promise<CategoryActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const useCase = new UpdateCategory(new SupabaseCategoryRepository(supabase));
    await useCase.execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la categoría.' };
  }

  revalidatePath('/categories');
  revalidatePath('/transactions');
  return { success: true };
}

export async function countCategoryBudgetsAction(id: string): Promise<{ count: number } | { error: string }> {
  try {
    const { supabase, userId } = await requireUserId();
    const count = await new CountCategoryBudgets(new SupabaseCategoryRepository(supabase)).execute(userId, id);
    return { count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo verificar los presupuestos.' };
  }
}

export async function deleteCategoryAction(id: string): Promise<CategoryActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    const useCase = new DeleteCategory(new SupabaseCategoryRepository(supabase));
    await useCase.execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la categoría.' };
  }

  revalidatePath('/categories');
  revalidatePath('/transactions');
  return { success: true };
}
