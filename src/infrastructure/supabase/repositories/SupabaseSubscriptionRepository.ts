import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  ISubscriptionRepository,
  SubscriptionInput,
} from '@/domain/repositories/ISubscriptionRepository';
import type {
  BillingCycle,
  RecurringKind,
  Subscription,
  SubscriptionStatus,
} from '@/domain/entities/Subscription';

const SELECT_WITH_JOINS =
  'id, name, kind, is_essential, debt_id, last_reviewed_at, amount_is_estimate, cycle_confirmed, notes, category_id, account_id, amount, currency, billing_cycle, next_billing_date, status, icon, color, created_at, categories:category_id(name), accounts:account_id(name)';

interface RawSubscriptionRow {
  id: string;
  name: string;
  category_id: string | null;
  account_id: string | null;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle | null;
  amount_is_estimate: boolean;
  cycle_confirmed: boolean;
  notes: string | null;
  kind: RecurringKind;
  is_essential: boolean;
  debt_id: string | null;
  last_reviewed_at: string | null;
  next_billing_date: string | null;
  status: SubscriptionStatus;
  icon: string;
  color: string;
  created_at: string;
  categories: { name: string } | null;
  accounts: { name: string } | null;
}

function mapRow(row: RawSubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    accountId: row.account_id,
    accountName: row.accounts?.name ?? null,
    amount: Number(row.amount),
    kind: row.kind,
    isEssential: row.is_essential,
    debtId: row.debt_id,
    lastReviewedAt: row.last_reviewed_at,
    currency: row.currency,
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    amountIsEstimate: row.amount_is_estimate ?? false,
    cycleConfirmed: row.cycle_confirmed ?? true,
    notes: row.notes ?? null,
    status: row.status,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
  };
}

export class SupabaseSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(userId: string): Promise<Subscription[]> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select(SELECT_WITH_JOINS)
      .eq('user_id', userId)
      .order('status')
      .order('next_billing_date');

    if (error) {
      console.error('[SupabaseSubscriptionRepository.list]', error);
      throw new Error(`No se pudieron cargar las suscripciones: ${error.message}`);
    }

    return ((data ?? []) as unknown as RawSubscriptionRow[]).map(mapRow);
  }

  async create(userId: string, input: SubscriptionInput): Promise<Subscription> {
    const { data, error } = await this.client
      .from('subscriptions')
      .insert({
        user_id: userId,
        name: input.name,
        kind: input.kind,
        is_essential: input.isEssential,
        debt_id: input.kind === 'loan_installment' ? (input.debtId ?? null) : null,
        category_id: input.categoryId ?? null,
        account_id: input.accountId ?? null,
        amount: input.amount,
        currency: input.currency,
        billing_cycle: input.billingCycle,
        next_billing_date: input.nextBillingDate ?? null,
        amount_is_estimate: input.amountIsEstimate,
        cycle_confirmed: input.cycleConfirmed,
        notes: input.notes ?? null,
        icon: input.icon,
        color: input.color,
      })
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) {
      console.error('[SupabaseSubscriptionRepository.create]', error);
      throw new Error(`No se pudo crear la suscripción: ${error.message}`);
    }

    return mapRow(data as unknown as RawSubscriptionRow);
  }

  async update(userId: string, id: string, input: SubscriptionInput): Promise<Subscription> {
    const { data, error } = await this.client
      .from('subscriptions')
      .update({
        name: input.name,
        kind: input.kind,
        is_essential: input.isEssential,
        debt_id: input.kind === 'loan_installment' ? (input.debtId ?? null) : null,
        category_id: input.categoryId ?? null,
        account_id: input.accountId ?? null,
        amount: input.amount,
        currency: input.currency,
        billing_cycle: input.billingCycle,
        next_billing_date: input.nextBillingDate ?? null,
        amount_is_estimate: input.amountIsEstimate,
        cycle_confirmed: input.cycleConfirmed,
        notes: input.notes ?? null,
        icon: input.icon,
        color: input.color,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) {
      console.error('[SupabaseSubscriptionRepository.update]', error);
      throw new Error(`No se pudo actualizar la suscripción: ${error.message}`);
    }

    return mapRow(data as unknown as RawSubscriptionRow);
  }

  async setStatus(userId: string, id: string, status: SubscriptionStatus): Promise<void> {
    const { error } = await this.client
      .from('subscriptions')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[SupabaseSubscriptionRepository.setStatus]', error);
      throw new Error(`No se pudo actualizar el estado: ${error.message}`);
    }
  }

  async markReviewed(userId: string, id: string, date: string): Promise<void> {
    const { error } = await this.client
      .from('subscriptions')
      .update({ last_reviewed_at: date })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      console.error('[SupabaseSubscriptionRepository.markReviewed]', error.code);
      throw new Error('No se pudo marcar como revisada.');
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    const { error } = await this.client.from('subscriptions').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseSubscriptionRepository.delete]', error);
      throw new Error(`No se pudo eliminar la suscripción: ${error.message}`);
    }
  }
}
