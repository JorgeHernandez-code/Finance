'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseInvestmentRepository } from '@/infrastructure/supabase/repositories/SupabaseInvestmentRepository';
import { CreateInvestment } from '@/application/use-cases/investments/CreateInvestment';
import { UpdateInvestment } from '@/application/use-cases/investments/UpdateInvestment';
import { DeleteInvestment } from '@/application/use-cases/investments/DeleteInvestment';
import { AddInvestmentValuation } from '@/application/use-cases/investments/AddInvestmentValuation';
import type { InvestmentInputDto, UpdateInvestmentInput, InvestmentValuationInputDto } from '@/application/dto/investment';

export interface InvestmentActionResult {
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

export async function createInvestmentAction(input: InvestmentInputDto): Promise<InvestmentActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new CreateInvestment(new SupabaseInvestmentRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la inversión.' };
  }
  revalidatePath('/investments');
  return { success: true };
}

export async function updateInvestmentAction(input: UpdateInvestmentInput): Promise<InvestmentActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateInvestment(new SupabaseInvestmentRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la inversión.' };
  }
  revalidatePath('/investments');
  return { success: true };
}

export async function deleteInvestmentAction(id: string): Promise<InvestmentActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new DeleteInvestment(new SupabaseInvestmentRepository(supabase)).execute(userId, id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar la inversión.' };
  }
  revalidatePath('/investments');
  return { success: true };
}

export async function addInvestmentValuationAction(input: InvestmentValuationInputDto): Promise<InvestmentActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new AddInvestmentValuation(new SupabaseInvestmentRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar la valuación.' };
  }
  revalidatePath('/investments');
  return { success: true };
}
