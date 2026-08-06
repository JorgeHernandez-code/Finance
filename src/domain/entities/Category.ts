export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  parentName: string | null;
  color: string;
  icon: string;
  /** Categorías creadas por el trigger de seed/sistema — no se pueden borrar (RLS lo impide también). */
  isSystem: boolean;
  createdAt: string;
}
