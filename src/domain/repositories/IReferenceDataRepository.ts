import type { AccountOption, CategoryOption, ClientOption } from '@/domain/entities/ReferenceOption';

/**
 * Listas ligeras para poblar selects (cuentas/categorías/clientes activos del
 * usuario). Usado hoy por el formulario de transacciones; lo reutilizarán
 * presupuestos, suscripciones y deudas más adelante.
 */
export interface IReferenceDataRepository {
  listAccounts(userId: string): Promise<AccountOption[]>;
  listCategories(userId: string): Promise<CategoryOption[]>;
  listClients(userId: string): Promise<ClientOption[]>;
}
