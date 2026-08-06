/**
 * Opciones "ligeras" de cuentas/categorías/clientes para poblar selects en
 * formularios de otros módulos (transacciones, presupuestos, suscripciones...).
 * No son la entidad completa de cada módulo — cuando Fase 8/9/14 construyan
 * el CRUD real de categorías/cuentas/clientes, estas listas seguirán sirviendo
 * como la fuente ligera para selects sin duplicar lógica.
 */
export interface AccountOption {
  id: string;
  name: string;
  currency: string;
  icon: string;
  color: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

export interface ClientOption {
  id: string;
  name: string;
}
