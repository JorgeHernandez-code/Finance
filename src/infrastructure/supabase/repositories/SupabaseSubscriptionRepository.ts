import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ISubscriptionRepository, SubscriptionInput } from '@/domain/repositories/ISubscriptionRepository';
import type { Subscription, SubscriptionStatus } from '@/domain/entities/Subscription';

const SELECT_WITH_JOINS =
  'id, name, category_id, account_id, amount, currency, billing_cycle, next_billing_date, status, icon, color, created_at, categories:category_id(name), accounts:account_id(name)';

interface RawSubscriptionRow {
  id: string;
  name: string;
  category_id: string | null;
  account_id: string | null;
  amount: number;
  currency: string;
  billing_cycle: 'weekly' | 'monthly' | 'yearly';
  next_billing_date: string;
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
    amount: row.amount,
    currency: row.currency,
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
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
        category_id: input.categoryId ?? null,
        account_id: input.accountId ?? null,
        amount: input.amount,
        currency: input.currency,
        billing_cycle: input.billingCycle,
        next_billing_date: input.nextBillingDate,
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
        category_id: input.categoryId ?? null,
        account_id: input.accountId ?? null,
        amount: input.amount,
        currency: input.currency,
        billing_cycle: input.billingCycle,
        next_billing_date: input.nextBillingDate,
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
    const { error } = await this.client.from('subscriptions').update({ status }).eq('id', id).eq('user_id', userId);

    if (error) {
      console.error('[SupabaseSubscriptionRepository.setStatus]', error);
      throw new Error(`No se pudo actualizar el estado: ${error.message}`);
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
