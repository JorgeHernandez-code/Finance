import type { Investment, InvestmentType } from '@/domain/entities/Investment';

export interface InvestmentInput {
  name: string;
  type: InvestmentType;
  amountInvested: number;
  startDate: string;
  notes?: string | null;
}

export interface InvestmentValuationInput {
  value: number;
  valuationDate: string;
}

/** investment_valuations.investment_id es ON DELETE CASCADE: borrar una inversión borra su historial de valuaciones (registro hijo, esperado). */
export interface IInvestmentRepository {
  list(userId: string): Promise<Investment[]>;
  create(userId: string, input: InvestmentInput): Promise<Investment>;
  update(userId: string, id: string, input: InvestmentInput): Promise<Investment>;
  delete(userId: string, id: string): Promise<void>;
  addValuation(userId: string, investmentId: string, input: InvestmentValuationInput): Promise<Investment>;
}
