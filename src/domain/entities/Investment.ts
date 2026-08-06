export type InvestmentType = 'stocks' | 'crypto' | 'real_estate' | 'business' | 'other';

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  amountInvested: number;
  startDate: string;
  notes: string | null;
  /** Última valuación registrada en investment_valuations; si no hay ninguna, igual a amountInvested. */
  currentValue: number;
  lastValuationDate: string | null;
  gainLoss: number;
  gainLossPercent: number;
  createdAt: string;
}
