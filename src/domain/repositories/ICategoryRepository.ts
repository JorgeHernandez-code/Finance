import type { Category, CategoryType } from '@/domain/entities/Category';

export interface CategoryInput {
  name: string;
  type: CategoryType;
  parentId?: string | null;
  color: string;
  icon: string;
}

/**
 * Sin filtros/paginación como en transacciones: una lista de categorías de
 * un usuario es chica por naturaleza (decenas, no miles), se trae completa
 * y se agrupa/filtra en el cliente.
 */
export interface ICategoryRepository {
  list(userId: string): Promise<Category[]>;
  create(userId: string, input: CategoryInput): Promise<Category>;
  update(userId: string, id: string, input: CategoryInput): Promise<Category>;
  /** Falla con un mensaje claro si RLS la bloquea por ser una categoría del sistema (is_system = true). */
  delete(userId: string, id: string): Promise<void>;
  /** budgets.category_id es ON DELETE CASCADE: borrar la categoría borra también sus presupuestos. La UI debe avisar esto antes de confirmar. */
  countBudgets(userId: string, categoryId: string): Promise<number>;
}
