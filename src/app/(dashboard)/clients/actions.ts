'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseClientRepository } from '@/infrastructure/supabase/repositories/SupabaseClientRepository';
import { CreateClient } from '@/application/use-cases/clients/CreateClient';
import { UpdateClient } from '@/application/use-cases/clients/UpdateClient';
import { DeleteClient } from '@/application/use-cases/clients/DeleteClient';
import type { ClientInputDto, UpdateClientInput } from '@/application/dto/client';

export interface ClientActionResult {
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

export async function createClientAction(input: ClientInputDto): Promise<ClientActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateClient(new SupabaseClientRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear el cliente.' };
  }
  revalidatePath('/clients');
  revalidatePath('/transactions');
  return { success: true };
}

export async function updateClientAction(input: UpdateClientInput): Promise<ClientActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateClient(new SupabaseClientRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar el cliente.' };
  }
  revalidatePath('/clients');
  revalidatePath('/transactions');
  return { success: true };
}

export async function deleteClientAction(id: string): Promise<ClientActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteClient(new SupabaseClientRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar el cliente.' };
  }
  revalidatePath('/clients');
  revalidatePath('/transactions');
  return { success: true };
}
