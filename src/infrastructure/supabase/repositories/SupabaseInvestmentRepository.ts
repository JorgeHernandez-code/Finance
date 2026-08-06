import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { IInvestmentRepository, InvestmentInput, InvestmentValuationInput } from '@/domain/repositories/IInvestmentRepository';
import type { Investment, InvestmentType } from '@/domain/entities/Investment';

interface RawInvestmentRow {
  id: string;
  name: string;
  type: InvestmentType;
  amount_invested: number;
  start_date: string;
  notes: string | null;
  created_at: string;
}

interface LatestValuation {
  value: number;
  valuation_date: string;
}

function mapRow(row: RawInvestmentRow, latest?: LatestValuation): Investment {
  const currentValue = latest?.value ?? row.amount_invested;
  const gainLoss = currentValue - row.amount_invested;
  const gainLossPercent = row.amount_invested > 0 ? (gainLoss / row.amount_invested) * 100 : 0;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amountInvested: row.amount_invested,
    startDate: row.start_date,
    notes: row.notes,
    currentValue,
    lastValuationDate: latest?.valuation_date ?? null,
    gainLoss,
    gainLossPercent,
    createdAt: row.created_at,
  };
}

export class SupabaseInvestmentRepository implements IInvestmentRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  /** Trae la valuación más reciente por inversión (unique en (investment_id, valuation_date), ordenada desc y reducida a la primera por id). */
  private async getLatestValuations(investmentIds: string[]): Promise<Map<string, LatestValuation>> {
    if (investmentIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from('investment_valuations')
      .select('investment_id, value, valuation_date')
      .in('investment_id', investmentIds)
      .order('valuation_date', { ascending: false });

    if (error) {
      console.error('[SupabaseInvestmentRepository.getLatestValuations]', error);
      throw new Error(`No se pudo calcular el valor actual de las inversiones: ${error.message}`);
    }

    const latestByInvestment = new Map<string, LatestValuation>();
    for (const row of data ?? []) {
      if (!latestByInvestment.has(row.investment_id)) {
        latestByInvestment.set(row.investment_id, { value: row.value, valuation_date: row.valuation_date });
      }
    }
    return latestByInvestment;
  }

  async list(userId: string): Promise<Investment[]> {
    const { data, error } = await this.client
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseInvestmentRepository.list]', error);
      throw new Error(`No se pudieron cargar las inversiones: ${error.message}`);
    }

    const rows = data ?? [];
    const latestByInvestment = await this.getLatestValuations(rows.map((row) => row.id));

    return rows.map((row) => mapRow(row, latestByInvestment.get(row.id)));
  }

  async create(userId: string, input: InvestmentInput): Promise<Investment> {
    const { data, error } = await this.client
      .from('investments')
      .insert({
        user_id: userId,
        name: input.name,
        type: input.type,
        amount_invested: input.amountInvested,
        start_date: input.startDate,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseInvestmentRepository.create]', error);
      throw new Error(`No se pudo crear la inversión: ${error.message}`);
    }

    return mapRow(data);
  }

  async update(userId: string, id: string, input: InvestmentInput): Promise<Investment> {
    const { data, error } = await this.client
      .from('investments')
      .update({
        name: input.name,
        type: input.type,
        amount_invested: input.amountInvested,
        start_date: input.startDate,
        notes: input.notes ?? null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('[SupabaseInvestmentRepository.update]', error);
      throw new Error(`No se pudo actualizar la inversión: ${error.message}`);
    }

    const latest = await this.getLatestValuations([id]);
    return mapRow(data, latest.get(id));
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('investments').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseInvestmentRepository.delete]', error);
      throw new Error(`No se pudo eliminar la inversión: ${error.message}`);
    }
  }

  async addValuation(userId: string, investmentId: string, input: InvestmentValuationInput): Promise<Investment> {
    const { error: valuationError } = await this.client.from('investment_valuations').upsert(
      {
        investment_id: investmentId,
        value: input.value,
        valuation_date: input.valuationDate,
      },
      { onConflict: 'investment_id,valuation_date' }
    );

    if (valuationError) {
      console.error('[SupabaseInvestmentRepository.addValuation]', valuationError);
      throw new Error(`No se pudo registrar la valuación: ${valuationError.message}`);
    }

    const { data, error } = await this.client.from('investments').select('*').eq('id', investmentId).eq('user_id', userId).single();

    if (error) {
      console.error('[SupabaseInvestmentRepository.addValuation refetch]', error);
      throw new Error(`La valuación se registró, pero no se pudo recargar la inversión: ${error.message}`);
    }

    const latest = await this.getLatestValuations([investmentId]);
    return mapRow(data, latest.get(investmentId));
  }
}
