'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseSubscriptionRepository } from '@/infrastructure/supabase/repositories/SupabaseSubscriptionRepository';
import { CreateSubscription } from '@/application/use-cases/subscriptions/CreateSubscription';
import { UpdateSubscription } from '@/application/use-cases/subscriptions/UpdateSubscription';
import { SetSubscriptionStatus } from '@/application/use-cases/subscriptions/SetSubscriptionStatus';
import { DeleteSubscription } from '@/application/use-cases/subscriptions/DeleteSubscription';
import type { SubscriptionInputDto, UpdateSubscriptionInput } from '@/application/dto/subscription';
import type { SubscriptionStatus } from '@/domain/entities/Subscription';

export interface SubscriptionActionResult {
  error?: string;
  success?: boolean;
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado.');
  return { supabase, userId: user.id };
}

export async function createSubscriptionAction(input: SubscriptionInputDto): Promise<SubscriptionActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateSubscription(new SupabaseSubscriptionRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la suscripción.' };
  }
  revalidatePath('/subscriptions');
  return { success: true };
}

export async function updateSubscriptionAction(input: UpdateSubscriptionInput): Promise<SubscriptionActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateSubscription(new SupabaseSubscriptionRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la suscripción.' };
  }
  revalidatePath('/subscriptions');
  return { success: true };
}

export async function setSubscriptionStatusAction(
  id: string,
  status: SubscriptionStatus
): Promise<SubscriptionActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new SetSubscriptionStatus(new SupabaseSubscriptionRepository(supabase)).execute(userId, { id, status });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar el estado.' };
  }
  revalidatePath('/subscriptions');
  return { success: true };
}

export async function deleteSubscriptionAction(id: string): Promise<SubscriptionActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteSubscription(new SupabaseSubscriptionRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la suscripción.' };
  }
  revalidatePath('/subscriptions');
  return { success: true };
}
