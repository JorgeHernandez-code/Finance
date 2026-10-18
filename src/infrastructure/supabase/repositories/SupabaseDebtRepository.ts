import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  IDebtRepository,
  DebtInput,
  DebtPaymentInput,
  DebtBalanceConfirmation,
} from '@/domain/repositories/IDebtRepository';
import type { Debt, DebtPayment } from '@/domain/entities/Debt';
import { friendlyDbError, mapDebt, num, numOrNull } from '../mappers';

function toRow(input: DebtInput) {
  return {
    creditor_name: input.creditorName,
    direction: input.direction,
    kind: input.kind,
    currency: input.currency,
    country: input.country ?? null,
    principal_amount: input.principalAmount ?? null,
    amount_is_estimate: input.amountIsEstimate ?? false,
    responsibility: input.responsibility ?? 'own',
    legal_holder: input.legalHolder ?? null,
    next_installment_number: input.nextInstallmentNumber ?? null,
    interest_rate: input.interestRate ?? null,
    interest_rate_period: input.interestRate ? (input.interestRatePeriod ?? null) : null,
    start_date: input.startDate,
    due_date: input.dueDate ?? null,
    next_payment_date: input.nextPaymentDate ?? null,
    installment_amount: input.installmentAmount ?? null,
    installments_total: input.installmentsTotal ?? null,
    status: input.status,
    priority: input.priority ?? null,
    negotiable: input.negotiable,
    notes: input.notes ?? null,
  };
}

export class SupabaseDebtRepository implements IDebtRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async getOne(userId: string, id: string): Promise<Debt> {
    const [debtRes, balanceRes] = await Promise.all([
      this.client.from('debts').select('*').eq('id', id).eq('user_id', userId).single(),
      this.client.from('v_debt_balance').select('*').eq('debt_id', id).maybeSingle(),
    ]);
    if (debtRes.error) throw new Error('No se pudo recargar la deuda.');
    return mapDebt(debtRes.data, balanceRes.data ?? undefined);
  }

  async list(userId: string): Promise<Debt[]> {
    const [debtsRes, balancesRes] = await Promise.all([
      this.client.from('debts').select('*').eq('user_id', userId).order('status').order('due_date'),
      this.client.from('v_debt_balance').select('*').eq('user_id', userId),
    ]);

    if (debtsRes.error) {
      console.error('[SupabaseDebtRepository.list]', debtsRes.error.code);
      throw new Error('No se pudieron cargar las deudas.');
    }
    if (balancesRes.error) {
      console.error('[SupabaseDebtRepository.list balances]', balancesRes.error.code);
      throw new Error('No se pudo calcular el saldo de las deudas.');
    }

    const balanceByDebt = new Map((balancesRes.data ?? []).map((row) => [row.debt_id, row]));
    return (debtsRes.data ?? []).map((row) => mapDebt(row, balanceByDebt.get(row.id)));
  }

  async listPayments(userId: string, debtId: string): Promise<DebtPayment[]> {
    // RLS ya limita debt_payments a deudas propias; el filtro por deuda propia es defensa adicional.
    const { data: owner } = await this.client
      .from('debts')
      .select('id')
      .eq('id', debtId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!owner) return [];
    const { data, error } = await this.client
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('payment_date', { ascending: false });
    if (error) throw new Error('No se pudo cargar el historial de pagos.');
    return (data ?? []).map((p) => ({
      id: p.id,
      debtId: p.debt_id,
      amount: num(p.amount),
      paymentDate: p.payment_date,
      interestAmount: numOrNull(p.interest_amount),
      feesAmount: numOrNull(p.fees_amount),
      transactionId: p.transaction_id ?? null,
      notes: p.notes,
      createdAt: p.created_at,
    }));
  }

  async create(userId: string, input: DebtInput): Promise<Debt> {
    const { data, error } = await this.client
      .from('debts')
      .insert({ user_id: userId, ...toRow(input) })
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseDebtRepository.create]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo crear la deuda.'));
    }
    return mapDebt(data);
  }

  async update(userId: string, id: string, input: DebtInput): Promise<Debt> {
    const { error } = await this.client.from('debts').update(toRow(input)).eq('id', id).eq('user_id', userId);
    if (error) {
      console.error('[SupabaseDebtRepository.update]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo actualizar la deuda.'));
    }
    return this.getOne(userId, id);
  }

  async confirmBalance(userId: string, id: string, input: DebtBalanceConfirmation): Promise<void> {
    const { error } = await this.client
      .from('debts')
      .update({ balance_confirmed_amount: input.amount, balance_confirmed_at: input.confirmedAt })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      console.error('[SupabaseDebtRepository.confirmBalance]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo confirmar el saldo.'));
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('debts').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      console.error('[SupabaseDebtRepository.delete]', error.code);
      throw new Error('No se pudo eliminar la deuda.');
    }
  }

  /** Atómico e idempotente vía record_debt_payment (ver 0014). */
  async addPayment(_userId: string, debtId: string, input: DebtPaymentInput): Promise<void> {
    const { error } = await this.client.rpc('record_debt_payment', {
      p_debt_id: debtId,
      p_amount: input.amount,
      p_payment_date: input.paymentDate,
      p_interest_amount: input.interestAmount ?? null,
      p_fees_amount: input.feesAmount ?? null,
      p_notes: input.notes ?? null,
      p_account_id: input.accountId ?? null,
      p_category_id: input.accountId ? (input.categoryId ?? null) : null,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) {
      console.error('[SupabaseDebtRepository.addPayment]', error.code);
      throw new Error(friendlyDbError(error.message, 'No se pudo registrar el pago.'));
    }
  }
}
