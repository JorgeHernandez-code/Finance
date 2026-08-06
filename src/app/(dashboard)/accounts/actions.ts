'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseAccountRepository } from '@/infrastructure/supabase/repositories/SupabaseAccountRepository';
import { CreateAccount } from '@/application/use-cases/accounts/CreateAccount';
import { UpdateAccount } from '@/application/use-cases/accounts/UpdateAccount';
import { ArchiveAccount } from '@/application/use-cases/accounts/ArchiveAccount';
import { DeleteAccount } from '@/application/use-cases/accounts/DeleteAccount';
import { CountAccountTransactions } from '@/application/use-cases/accounts/CountAccountTransactions';
import type { AccountInputDto, UpdateAccountInput } from '@/application/dto/account';

export interface AccountActionResult {
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

function revalidateAccountPaths() {
  revalidatePath('/accounts');
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
}

export async function createAccountAction(input: AccountInputDto): Promise<AccountActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateAccount(new SupabaseAccountRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la cuenta.' };
  }
  revalidateAccountPaths();
  return { success: true };
}

export async function updateAccountAction(input: UpdateAccountInput): Promise<AccountActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateAccount(new SupabaseAccountRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la cuenta.' };
  }
  revalidateAccountPaths();
  return { success: true };
}

export async function setAccountArchivedAction(id: string, archived: boolean): Promise<AccountActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new ArchiveAccount(new SupabaseAccountRepository(supabase)).execute(userId, { id, archived });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la cuenta.' };
  }
  revalidateAccountPaths();
  return { success: true };
}

export async function deleteAccountAction(id: string): Promise<AccountActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteAccount(new SupabaseAccountRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.' };
  }
  revalidateAccountPaths();
  return { success: true };
}

export async function countAccountTransactionsAction(id: string): Promise<{ count: number } | { error: string }> {
  try {
    const { supabase, userId } = await requireUserId();
    const count = await new CountAccountTransactions(new SupabaseAccountRepository(supabase)).execute(userId, id);
    return { count };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo verificar las transacciones.' };
  }
}
