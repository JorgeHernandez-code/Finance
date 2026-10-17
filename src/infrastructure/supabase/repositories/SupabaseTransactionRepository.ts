import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  ITransactionRepository,
  TransactionFilters,
  TransactionInput,
  TransferInput,
} from '@/domain/repositories/ITransactionRepository';
import type { Transaction, TransactionListResult } from '@/domain/entities/Transaction';
import { friendlyDbError } from '../mappers';

const SELECT_WITH_JOINS =
  'id, account_id, category_id, client_id, type, transfer_direction, transfer_pair_id, amount, currency, description, notes, transaction_date, created_at, accounts:account_id(name), categories:category_id(name, color), clients:client_id(name)';

interface RawTransactionRow {
  id: string;
  account_id: string;
  category_id: string | null;
  client_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  transfer_direction: 'in' | 'out' | null;
  transfer_pair_id: string | null;
  amount: number;
  currency: string;
  description: string;
  notes: string | null;
  transaction_date: string;
  created_at: string;
  accounts: { name: string } | null;
  categories: { name: string; color: string } | null;
  clients: { name: string } | null;
}

function mapRow(row: RawTransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.accounts?.name ?? '—',
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    categoryColor: row.categories?.color ?? null,
    clientId: row.client_id,
    clientName: row.clients?.name ?? null,
    // Las piernas de una transferencia se muestran como entrada/salida, con
    // isTransfer = true para que la UI no las trate como ingreso o gasto.
    type: row.type === 'transfer' ? (row.transfer_direction === 'in' ? 'income' : 'expense') : row.type,
    isTransfer: row.type === 'transfer',
    transferPairId: row.transfer_pair_id,
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description,
    notes: row.notes,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
  };
}

export class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: string, filters: TransactionFilters): Promise<TransactionListResult> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from('transactions')
      .select(SELECT_WITH_JOINS, { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
    if (filters.accountId) query = query.eq('account_id', filters.accountId);
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);
    if (filters.search) query = query.ilike('description', `%${filters.search}%`);

    const { data, error, count } = await query;
    if (error) {
      console.error('[SupabaseTransactionRepository.list]', error);
      throw new Error(`No se pudieron cargar las transacciones: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as RawTransactionRow[];
    return { items: rows.map(mapRow), total: count ?? 0, page, pageSize };
  }

  /**
   * La moneda de la transacción sigue a la de la cuenta (una cuenta en USD,
   * como PayPal en el seed, no debe registrar movimientos en COP) — se
   * resuelve server-side en vez de confiar en lo que mande el cliente.
   */
  private async getAccountCurrency(userId: string, accountId: string): Promise<string> {
    const { data, error } = await this.client
      .from('accounts')
      .select('currency')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new Error('La cuenta seleccionada no existe o no te pertenece.');
    }
    return data.currency;
  }

  async create(userId: string, input: TransactionInput): Promise<Transaction> {
    const currency = await this.getAccountCurrency(userId, input.accountId);

    const { data, error } = await this.client
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: input.accountId,
        category_id: input.categoryId,
        client_id: input.clientId ?? null,
        type: input.type,
        amount: input.amount,
        currency,
        description: input.description,
        notes: input.notes ?? null,
        transaction_date: input.transactionDate,
        idempotency_key: input.idempotencyKey ?? null,
      })
      .select(SELECT_WITH_JOINS)
      .single();

    if (error && input.idempotencyKey && /duplicate key|unique/i.test(error.message)) {
      // Mismo envío recibido dos veces: devolver el movimiento ya creado.
      const { data: existing } = await this.client
        .from('transactions')
        .select(SELECT_WITH_JOINS)
        .eq('user_id', userId)
        .eq('idempotency_key', input.idempotencyKey)
        .single();
      if (existing) return mapRow(existing as unknown as RawTransactionRow);
    }
    if (error) {
      console.error('[SupabaseTransactionRepository.create]', error.code);
      throw new Error('No se pudo crear la transacción.');
    }

    return mapRow(data as unknown as RawTransactionRow);
  }

  async update(userId: string, id: string, input: TransactionInput): Promise<Transaction> {
    const currency = await this.getAccountCurrency(userId, input.accountId);

    const { data, error } = await this.client
      .from('transactions')
      .update({
        account_id: input.accountId,
        category_id: input.categoryId,
        client_id: input.clientId ?? null,
        type: input.type,
        amount: input.amount,
        currency,
        description: input.description,
        notes: input.notes ?? null,
        transaction_date: input.transactionDate,
      })
      .eq('id', id)
      .eq('user_id', userId)
      // Las transferencias no se editan como ingreso/gasto (se eliminan y se registran de nuevo).
      .neq('type', 'transfer')
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) {
      console.error('[SupabaseTransactionRepository.update]', error);
      throw new Error(`No se pudo actualizar la transacción: ${error.message}`);
    }

    return mapRow(data as unknown as RawTransactionRow);
  }

  async createTransfer(input: TransferInput): Promise<void> {
    const { error } = await this.client.rpc('create_transfer', {
      p_from_account: input.fromAccountId,
      p_to_account: input.toAccountId,
      p_amount_out: input.amountOut,
      p_amount_in: input.amountIn,
      p_date: input.transactionDate,
      p_description: input.description,
      p_notes: input.notes ?? null,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) {
      console.error('[SupabaseTransactionRepository.createTransfer]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo registrar la transferencia.'));
    }
  }

  /** Borrar una pierna de una transferencia borra (lógicamente) las dos: nunca queda media transferencia. */
  async softDelete(userId: string, id: string): Promise<void> {
    const { data: row } = await this.client
      .from('transactions')
      .select('transfer_pair_id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    const ids = [id, ...(row?.transfer_pair_id ? [row.transfer_pair_id] : [])];
    const { error } = await this.client
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      console.error('[SupabaseTransactionRepository.softDelete]', error);
      throw new Error(`No se pudo eliminar la transacción: ${error.message}`);
    }
  }
}
