import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IAccountRepository, AccountInput } from '@/domain/repositories/IAccountRepository';
import type { Account } from '@/domain/entities/Account';

export class SupabaseAccountRepository implements IAccountRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: string): Promise<Account[]> {
    // accounts (fila real) + v_account_balances (saldo calculado) se traen
    // por separado y se combinan en memoria: son fuentes distintas (tabla vs
    // vista) sin relación declarada para un embedded select automático.
    const [accountsRes, balancesRes] = await Promise.all([
      this.client.from('accounts').select('*').eq('user_id', userId).order('is_archived').order('name'),
      this.client.from('v_account_balances').select('account_id, current_balance').eq('user_id', userId),
    ]);

    if (accountsRes.error) {
      console.error('[SupabaseAccountRepository.list]', accountsRes.error);
      throw new Error(`No se pudieron cargar las cuentas: ${accountsRes.error.message}`);
    }
    if (balancesRes.error) {
      console.error('[SupabaseAccountRepository.list balances]', balancesRes.error);
      throw new Error(`No se pudo calcular el saldo de las cuentas: ${balancesRes.error.message}`);
    }

    const balanceByAccount = new Map((balancesRes.data ?? []).map((row) => [row.account_id, row.current_balance]));

    return (accountsRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      institution: row.institution,
      currency: row.currency,
      initialBalance: row.initial_balance,
      currentBalance: balanceByAccount.get(row.id) ?? row.initial_balance,
      color: row.color,
      icon: row.icon,
      isArchived: row.is_archived,
      createdAt: row.created_at,
    }));
  }

  async create(userId: string, input: AccountInput): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        institution: input.institution ?? null,
        currency: input.currency,
        initial_balance: input.initialBalance,
        color: input.color,
        icon: input.icon,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseAccountRepository.create]', error);
      throw new Error(`No se pudo crear la cuenta: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      institution: data.institution,
      currency: data.currency,
      initialBalance: data.initial_balance,
      currentBalance: data.initial_balance, // cuenta recién creada, sin transacciones todavía
      color: data.color,
      icon: data.icon,
      isArchived: data.is_archived,
      createdAt: data.created_at,
    };
  }

  async update(userId: string, id: string, input: AccountInput): Promise<Account> {
    const { data, error } = await this.client
      .from('accounts')
      .update({
        name: input.name,
        type: input.type,
        institution: input.institution ?? null,
        currency: input.currency,
        initial_balance: input.initialBalance,
        color: input.color,
        icon: input.icon,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseAccountRepository.update]', error);
      throw new Error(`No se pudo actualizar la cuenta: ${error.message}`);
    }

    const { data: balanceRow } = await this.client
      .from('v_account_balances')
      .select('current_balance')
      .eq('account_id', id)
      .maybeSingle();

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      institution: data.institution,
      currency: data.currency,
      initialBalance: data.initial_balance,
      currentBalance: balanceRow?.current_balance ?? data.initial_balance,
      color: data.color,
      icon: data.icon,
      isArchived: data.is_archived,
      createdAt: data.created_at,
    };
  }

  async setArchived(userId: string, id: string, archived: boolean): Promise<void> {
    const { error } = await this.client
      .from('accounts')
      .update({ is_archived: archived })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[SupabaseAccountRepository.setArchived]', error);
      throw new Error(`No se pudo ${archived ? 'archivar' : 'reactivar'} la cuenta: ${error.message}`);
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('accounts').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseAccountRepository.delete]', error);
      throw new Error(`No se pudo eliminar la cuenta: ${error.message}`);
    }
  }

  async countTransactions(userId: string, id: string): Promise<number> {
    const { count, error } = await this.client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) {
      console.error('[SupabaseAccountRepository.countTransactions]', error);
      throw new Error(`No se pudo verificar las transacciones de la cuenta: ${error.message}`);
    }

    return count ?? 0;
  }
}
