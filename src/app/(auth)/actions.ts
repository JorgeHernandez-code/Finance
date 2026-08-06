'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseAuthRepository } from '@/infrastructure/supabase/repositories/SupabaseAuthRepository';
import { checkLoginRateLimit } from '@/infrastructure/rate-limit/loginRateLimiter';
import { SignIn } from '@/application/use-cases/auth/SignIn';
import { SignUp } from '@/application/use-cases/auth/SignUp';
import { SignOut } from '@/application/use-cases/auth/SignOut';
import { RequestPasswordReset } from '@/application/use-cases/auth/RequestPasswordReset';
import { UpdatePassword } from '@/application/use-cases/auth/UpdatePassword';
import { SignInWithGoogle } from '@/application/use-cases/auth/SignInWithGoogle';
import { resetPasswordSchema } from '@/application/dto/auth';

export interface ActionState {
  error?: string;
  success?: boolean;
}

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  // Netlify/proxies estándar exponen la IP real del cliente en este header.
  return headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function readForm(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? '')]));
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const input = readForm(formData, ['email', 'password']) as { email: string; password: string };

  const ip = await getClientIp();
  const rateLimit = await checkLoginRateLimit(`${ip}:${input.email.toLowerCase()}`);
  if (!rateLimit.success) {
    return { error: `Demasiados intentos. Espera ${rateLimit.retryAfterSeconds ?? 60}s e inténtalo de nuevo.` };
  }

  const supabase = await createClient();
  const signIn = new SignIn(new SupabaseAuthRepository(supabase));

  try {
    await signIn.execute(input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' };
  }

  redirect('/dashboard');
}

export async function registerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const input = readForm(formData, ['fullName', 'email', 'password', 'confirmPassword']) as {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  };

  const supabase = await createClient();
  const signUp = new SignUp(new SupabaseAuthRepository(supabase));

  try {
    await signUp.execute(input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo crear la cuenta.' };
  }

  // Supabase por defecto exige confirmar el correo antes de poder iniciar sesión.
  return { success: true };
}

export async function forgotPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const input = readForm(formData, ['email']) as { email: string };
  const headerList = await headers();
  const origin = headerList.get('origin') ?? '';

  const supabase = await createClient();
  const requestReset = new RequestPasswordReset(new SupabaseAuthRepository(supabase));

  try {
    await requestReset.execute(input, `${origin}/auth/callback?next=/reset-password`);
  } catch {
    // Se ignora a propósito: nunca se revela si el correo existe o no.
  }

  return { success: true };
}

export async function resetPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const input = readForm(formData, ['password', 'confirmPassword']) as {
    password: string;
    confirmPassword: string;
  };

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  const supabase = await createClient();
  const updatePassword = new UpdatePassword(new SupabaseAuthRepository(supabase));

  try {
    await updatePassword.execute(parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.' };
  }

  redirect('/login');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  const signOut = new SignOut(new SupabaseAuthRepository(supabase));
  await signOut.execute();
  redirect('/login');
}

export async function googleSignInAction(): Promise<void> {
  const headerList = await headers();
  const origin = headerList.get('origin') ?? '';

  const supabase = await createClient();
  const signInWithGoogle = new SignInWithGoogle(new SupabaseAuthRepository(supabase));
  const { url } = await signInWithGoogle.execute(`${origin}/auth/callback`);
  redirect(url);
}
