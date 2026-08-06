import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IReferenceDataRepository } from '@/domain/repositories/IReferenceDataRepository';
import type { AccountOption, CategoryOption, ClientOption } from '@/domain/entities/ReferenceOption';

export class SupabaseReferenceDataRepository implements IReferenceDataRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listAccounts(userId: string): Promise<AccountOption[]> {
    const { data, error } = await this.client
      .from('accounts')
      .select('id, name, currency, icon, color')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('name');

    if (error) {
      console.error('[SupabaseReferenceDataRepository.listAccounts]', error);
      throw new Error(`No se pudieron cargar las cuentas: ${error.message}`);
    }
    return data ?? [];
  }

  async listCategories(userId: string): Promise<CategoryOption[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('id, name, type, color, icon')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.error('[SupabaseReferenceDataRepository.listCategories]', error);
      throw new Error(`No se pudieron cargar las categorías: ${error.message}`);
    }
    return data ?? [];
  }

  async listClients(userId: string): Promise<ClientOption[]> {
    const { data, error } = await this.client
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('[SupabaseReferenceDataRepository.listClients]', error);
      throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
    }
    return data ?? [];
  }
}
