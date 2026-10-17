import type {
  Subscription,
  BillingCycle,
  RecurringKind,
  SubscriptionStatus,
} from '@/domain/entities/Subscription';

export interface SubscriptionInput {
  name: string;
  kind: RecurringKind;
  isEssential: boolean;
  debtId?: string | null;
  categoryId?: string | null;
  accountId?: string | null;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  icon: string;
  color: string;
}

/** category_id/account_id son ON DELETE SET NULL: nunca se borra una suscripción por borrar su cuenta o categoría. */
export interface ISubscriptionRepository {
  list(userId: string): Promise<Subscription[]>;
  create(userId: string, input: SubscriptionInput): Promise<Subscription>;
  update(userId: string, id: string, input: SubscriptionInput): Promise<Subscription>;
  setStatus(userId: string, id: string, status: SubscriptionStatus): Promise<void>;
  /** Marca el recurrente como revisado hoy ("¿lo sigo necesitando?"). */
  markReviewed(userId: string, id: string, date: string): Promise<void>;
  delete(userId: string, id: string): Promise<void>;
}
