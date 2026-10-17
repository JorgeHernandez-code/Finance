'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseCategoryRepository } from '@/infrastructure/supabase/repositories/SupabaseCategoryRepository';
import { CreateCategory } from '@/application/use-cases/categories/CreateCategory';
import { UpdateCategory } from '@/application/use-cases/categories/UpdateCategory';
import { DeleteCategory } from '@/application/use-cases/categories/DeleteCategory';
import { CountCategoryBudgets } from '@/application/use-cases/categories/CountCategoryBudgets';
import type { CategoryInputDto, UpdateCategoryInput } from '@/application/dto/category';
import { SUGGESTED_CATEGORIES, normalizeName } from '@/shared/config/suggestedCategories';

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
    const count = await new CountCategoryBudgets(new SupabaseCategoryRepository(supabase)).execute(
      userId,
      id
    );
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

/**
 * Agrega las categorías sugeridas que el usuario aún no tiene (por nombre).
 * Acción explícita del usuario: nada se crea en segundo plano.
 */
export async function addSuggestedCategoriesAction(): Promise<{ error?: string; added?: number }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado.' };

    const { data: existing, error: readError } = await supabase
      .from('categories')
      .select('name, type')
      .eq('user_id', user.id);
    if (readError) return { error: 'No se pudieron leer tus categorías.' };
    const have = new Set((existing ?? []).map((c) => `${c.type}|${normalizeName(c.name)}`));
    const missing = SUGGESTED_CATEGORIES.filter((c) => !have.has(`${c.type}|${normalizeName(c.name)}`));
    if (missing.length === 0) return { added: 0 };

    const { error } = await supabase
      .from('categories')
      .insert(
        missing.map((c) => ({
          user_id: user.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          is_system: false,
        }))
      );
    if (error) return { error: 'No se pudieron agregar las categorías.' };
    revalidatePath('/categories');
    return { added: missing.length };
  } catch {
    return { error: 'No se pudieron agregar las categorías.' };
  }
}
