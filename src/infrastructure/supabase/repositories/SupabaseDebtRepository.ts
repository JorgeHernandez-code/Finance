import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IDebtRepository, DebtInput, DebtPaymentInput } from '@/domain/repositories/IDebtRepository';
import type { Debt } from '@/domain/entities/Debt';

interface RawDebtRow {
  id: string;
  creditor_name: string;
  direction: 'i_owe' | 'owed_to_me';
  principal_amount: number;
  interest_rate: number | null;
  start_date: string;
  due_date: string | null;
  status: 'active' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
}

interface BalanceRow {
  total_paid: number;
  remaining_balance: number;
}

function mapRow(row: RawDebtRow, balance?: BalanceRow): Debt {
  return {
    id: row.id,
    creditorName: row.creditor_name,
    direction: row.direction,
    principalAmount: row.principal_amount,
    interestRate: row.interest_rate,
    startDate: row.start_date,
    dueDate: row.due_date,
    status: row.status,
    notes: row.notes,
    totalPaid: balance?.total_paid ?? 0,
    remainingBalance: balance?.remaining_balance ?? row.principal_amount,
    createdAt: row.created_at,
  };
}

export class SupabaseDebtRepository implements IDebtRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async getBalance(id: string): Promise<BalanceRow | undefined> {
    const { data } = await this.client
      .from('v_debt_balance')
      .select('total_paid, remaining_balance')
      .eq('debt_id', id)
      .maybeSingle();
    return data ?? undefined;
  }

  async list(userId: string): Promise<Debt[]> {
    const [debtsRes, balancesRes] = await Promise.all([
      this.client.from('debts').select('*').eq('user_id', userId).order('status').order('due_date'),
      this.client.from('v_debt_balance').select('debt_id, total_paid, remaining_balance').eq('user_id', userId),
    ]);

    if (debtsRes.error) {
      console.error('[SupabaseDebtRepository.list]', debtsRes.error);
      throw new Error(`No se pudieron cargar las deudas: ${debtsRes.error.message}`);
    }
    if (balancesRes.error) {
      console.error('[SupabaseDebtRepository.list balances]', balancesRes.error);
      throw new Error(`No se pudo calcular el saldo de las deudas: ${balancesRes.error.message}`);
    }

    const balanceByDebt = new Map(
      (balancesRes.data ?? []).map((row) => [row.debt_id, { total_paid: row.total_paid, remaining_balance: row.remaining_balance }])
    );

    return (debtsRes.data ?? []).map((row) => mapRow(row, balanceByDebt.get(row.id)));
  }

  async create(userId: string, input: DebtInput): Promise<Debt> {
    const { data, error } = await this.client
      .from('debts')
      .insert({
        user_id: userId,
        creditor_name: input.creditorName,
        direction: input.direction,
        principal_amount: input.principalAmount,
        interest_rate: input.interestRate ?? null,
        start_date: input.startDate,
        due_date: input.dueDate ?? null,
        status: input.status,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseDebtRepository.create]', error);
      throw new Error(`No se pudo crear la deuda: ${error.message}`);
    }

    return mapRow(data);
  }

  async update(userId: string, id: string, input: DebtInput): Promise<Debt> {
    const { data, error } = await this.client
      .from('debts')
      .update({
        creditor_name: input.creditorName,
        direction: input.direction,
        principal_amount: input.principalAmount,
        interest_rate: input.interestRate ?? null,
        start_date: input.startDate,
        due_date: input.dueDate ?? null,
        status: input.status,
        notes: input.notes ?? null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseDebtRepository.update]', error);
      throw new Error(`No se pudo actualizar la deuda: ${error.message}`);
    }

    return mapRow(data, await this.getBalance(id));
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('debts').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseDebtRepository.delete]', error);
      throw new Error(`No se pudo eliminar la deuda: ${error.message}`);
    }
  }

  async addPayment(userId: string, debtId: string, input: DebtPaymentInput): Promise<Debt> {
    const { error: paymentError } = await this.client.from('debt_payments').insert({
      debt_id: debtId,
      amount: input.amount,
      payment_date: input.paymentDate,
      notes: input.notes ?? null,
    });

    if (paymentError) {
      console.error('[SupabaseDebtRepository.addPayment]', paymentError);
      throw new Error(`No se pudo registrar el abono: ${paymentError.message}`);
    }

    const { data, error } = await this.client.from('debts').select('*').eq('id', debtId).eq('user_id', userId).single();

    if (error) {
      console.error('[SupabaseDebtRepository.addPayment refetch]', error);
      throw new Error(`El abono se registró, pero no se pudo recargar la deuda: ${error.message}`);
    }

    return mapRow(data, await this.getBalance(debtId));
  }
}
