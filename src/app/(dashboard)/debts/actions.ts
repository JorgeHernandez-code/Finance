'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseDebtRepository } from '@/infrastructure/supabase/repositories/SupabaseDebtRepository';
import { CreateDebt } from '@/application/use-cases/debts/CreateDebt';
import { UpdateDebt } from '@/application/use-cases/debts/UpdateDebt';
import { DeleteDebt } from '@/application/use-cases/debts/DeleteDebt';
import { AddDebtPayment } from '@/application/use-cases/debts/AddDebtPayment';
import { ConfirmDebtBalance } from '@/application/use-cases/debts/ConfirmDebtBalance';
import type {
  DebtInputDto,
  UpdateDebtInput,
  DebtPaymentInputDto,
  ConfirmDebtBalanceInput,
} from '@/application/dto/debt';
import type { DebtPayment } from '@/domain/entities/Debt';

export interface DebtActionResult {
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

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  return error instanceof Error ? error.message : fallback;
}

function revalidateFinance() {
  revalidatePath('/debts');
  revalidatePath('/dashboard');
  revalidatePath('/net-worth');
  revalidatePath('/plan');
}

export async function createDebtAction(input: DebtInputDto): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateDebt(new SupabaseDebtRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo crear la deuda.') };
  }
  revalidateFinance();
  return { success: true };
}

export async function updateDebtAction(input: UpdateDebtInput): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateDebt(new SupabaseDebtRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo actualizar la deuda.') };
  }
  revalidateFinance();
  return { success: true };
}

export async function deleteDebtAction(id: string): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteDebt(new SupabaseDebtRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo eliminar la deuda.') };
  }
  revalidateFinance();
  return { success: true };
}

export async function addDebtPaymentAction(input: DebtPaymentInputDto): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new AddDebtPayment(new SupabaseDebtRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo registrar el pago.') };
  }
  revalidateFinance();
  revalidatePath('/transactions');
  revalidatePath('/accounts');
  return { success: true };
}

export async function confirmDebtBalanceAction(input: ConfirmDebtBalanceInput): Promise<DebtActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new ConfirmDebtBalance(new SupabaseDebtRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo confirmar el saldo.') };
  }
  revalidateFinance();
  return { success: true };
}

export async function listDebtPaymentsAction(
  debtId: string
): Promise<{ payments?: DebtPayment[]; error?: string }> {
  try {
    const id = z.string().uuid().parse(debtId);
    const { supabase, userId } = await requireUserId();
    return { payments: await new SupabaseDebtRepository(supabase).listPayments(userId, id) };
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo cargar el historial.') };
  }
}
