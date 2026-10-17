import type { BillingCycle, RecurringKind } from '@/domain/finance/snapshot';

export type { BillingCycle, RecurringKind };
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

/** Gasto recurrente (la tabla se llama subscriptions por historia; cubre arriendo, servicios, cuotas…). */
export interface Subscription {
  id: string;
  name: string;
  kind: RecurringKind;
  isEssential: boolean;
  debtId: string | null;
  lastReviewedAt: string | null;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string | null;
  accountName: string | null;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  status: SubscriptionStatus;
  icon: string;
  color: string;
  createdAt: string;
}

export const RECURRING_KIND_LABEL: Record<RecurringKind, string> = {
  subscription: 'Suscripción',
  rent: 'Arriendo',
  utilities: 'Servicios del hogar',
  food: 'Alimentación',
  transport: 'Transporte',
  phone: 'Telefonía',
  internet: 'Internet',
  loan_installment: 'Cuota de préstamo',
  personal: 'Gasto personal',
  business: 'Gasto comercial',
  extraordinary: 'Extraordinario',
  other: 'Otro',
};
