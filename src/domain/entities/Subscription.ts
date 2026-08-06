export type BillingCycle = 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  id: string;
  name: string;
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
