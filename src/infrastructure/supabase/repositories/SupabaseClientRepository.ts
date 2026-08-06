import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IClientRepository, ClientInput } from '@/domain/repositories/IClientRepository';
import type { Client } from '@/domain/entities/Client';

export class SupabaseClientRepository implements IClientRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: string): Promise<Client[]> {
    const [clientsRes, totalsRes] = await Promise.all([
      this.client.from('clients').select('*').eq('user_id', userId).order('status').order('name'),
      this.client.from('v_client_totals').select('client_id, total_income').eq('user_id', userId),
    ]);

    if (clientsRes.error) {
      console.error('[SupabaseClientRepository.list]', clientsRes.error);
      throw new Error(`No se pudieron cargar los clientes: ${clientsRes.error.message}`);
    }
    if (totalsRes.error) {
      console.error('[SupabaseClientRepository.list totals]', totalsRes.error);
      throw new Error(`No se pudo calcular la facturación por cliente: ${totalsRes.error.message}`);
    }

    const totalByClient = new Map((totalsRes.data ?? []).map((row) => [row.client_id, row.total_income]));

    return (clientsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      status: row.status,
      notes: row.notes,
      totalIncome: totalByClient.get(row.id) ?? 0,
      createdAt: row.created_at,
    }));
  }

  async create(userId: string, input: ClientInput): Promise<Client> {
    const { data, error } = await this.client
      .from('clients')
      .insert({
        user_id: userId,
        name: input.name,
        color: input.color,
        icon: input.icon,
        status: input.status,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseClientRepository.create]', error);
      throw new Error(`No se pudo crear el cliente: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      color: data.color,
      icon: data.icon,
      status: data.status,
      notes: data.notes,
      totalIncome: 0,
      createdAt: data.created_at,
    };
  }

  async update(userId: string, id: string, input: ClientInput): Promise<Client> {
    const { data, error } = await this.client
      .from('clients')
      .update({
        name: input.name,
        color: input.color,
        icon: input.icon,
        status: input.status,
        notes: input.notes ?? null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseClientRepository.update]', error);
      throw new Error(`No se pudo actualizar el cliente: ${error.message}`);
    }

    const { data: totalRow } = await this.client
      .from('v_client_totals')
      .select('total_income')
      .eq('client_id', id)
      .maybeSingle();

    return {
      id: data.id,
      name: data.name,
      color: data.color,
      icon: data.icon,
      status: data.status,
      notes: data.notes,
      totalIncome: totalRow?.total_income ?? 0,
      createdAt: data.created_at,
    };
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('clients').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseClientRepository.delete]', error);
      throw new Error(`No se pudo eliminar el cliente: ${error.message}`);
    }
  }
}
