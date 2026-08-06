import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ICategoryRepository, CategoryInput } from '@/domain/repositories/ICategoryRepository';
import type { Category } from '@/domain/entities/Category';

const SELECT_WITH_PARENT = 'id, name, type, parent_id, color, icon, is_system, created_at, parent:parent_id(name)';

interface RawCategoryRow {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id: string | null;
  color: string;
  icon: string;
  is_system: boolean;
  created_at: string;
  parent: { name: string } | null;
}

function mapRow(row: RawCategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    parentId: row.parent_id,
    parentName: row.parent?.name ?? null,
    color: row.color,
    icon: row.icon,
    isSystem: row.is_system,
    createdAt: row.created_at,
  };
}

export class SupabaseCategoryRepository implements ICategoryRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: string): Promise<Category[]> {
    const { data, error } = await this.client
      .from('categories')
      .select(SELECT_WITH_PARENT)
      .eq('user_id', userId)
      .order('type')
      .order('name');

    if (error) {
      console.error('[SupabaseCategoryRepository.list]', error);
      throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
    }

    return ((data ?? []) as unknown as RawCategoryRow[]).map(mapRow);
  }

  async create(userId: string, input: CategoryInput): Promise<Category> {
    const { data, error } = await this.client
      .from('categories')
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        parent_id: input.parentId ?? null,
        color: input.color,
        icon: input.icon,
      })
      .select(SELECT_WITH_PARENT)
      .single();

    if (error) {
      console.error('[SupabaseCategoryRepository.create]', error);
      throw new Error(`No se pudo crear la categoría: ${error.message}`);
    }

    return mapRow(data as unknown as RawCategoryRow);
  }

  async update(userId: string, id: string, input: CategoryInput): Promise<Category> {
    const { data, error } = await this.client
      .from('categories')
      .update({
        name: input.name,
        type: input.type,
        parent_id: input.parentId ?? null,
        color: input.color,
        icon: input.icon,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_WITH_PARENT)
      .single();

    if (error) {
      console.error('[SupabaseCategoryRepository.update]', error);
      throw new Error(`No se pudo actualizar la categoría: ${error.message}`);
    }

    return mapRow(data as unknown as RawCategoryRow);
  }

  async delete(userId: string, id: string): Promise<void> {
    const { data, error } = await this.client
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      console.error('[SupabaseCategoryRepository.delete]', error);
      throw new Error(`No se pudo eliminar la categoría: ${error.message}`);
    }

    // RLS bloquea el delete silenciosamente (0 filas, sin error) si es una
    // categoría del sistema o no le pertenece — lo convertimos en un error
    // explícito para que la UI pueda mostrarlo.
    if (!data || data.length === 0) {
      throw new Error('No se pudo eliminar: es una categoría del sistema o ya no existe.');
    }
  }

  async countBudgets(userId: string, categoryId: string): Promise<number> {
    const { count, error } = await this.client
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .eq('user_id', userId);

    if (error) {
      console.error('[SupabaseCategoryRepository.countBudgets]', error);
      throw new Error(`No se pudo verificar los presupuestos de la categoría: ${error.message}`);
    }

    return count ?? 0;
  }
}
