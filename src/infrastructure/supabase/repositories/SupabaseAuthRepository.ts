import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser, IAuthRepository } from '@/domain/repositories/IAuthRepository';

/**
 * Traduce errores de Supabase (en inglés, pensados para logs) a mensajes en
 * español seguros de mostrar al usuario. Nunca se filtran detalles internos
 * (ej. si el email existe o no en registro, para no habilitar enumeración de cuentas).
 */
function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión.',
    'User already registered': 'Ya existe una cuenta con ese correo.',
    'Password should be at least 6 characters': 'La contraseña es demasiado corta.',
    'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  };
  return known[message] ?? 'Ocurrió un error. Intenta de nuevo en unos momentos.';
}

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error.message));
    return { id: data.user.id, email: data.user.email ?? null };
  }

  async signUp(email: string, password: string, fullName?: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: fullName ? { full_name: fullName } : undefined },
    });
    if (error) throw new Error(translateAuthError(error.message));
    if (!data.user) throw new Error('No se pudo crear la cuenta. Intenta de nuevo.');
    return { id: data.user.id, email: data.user.email ?? null };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new Error(translateAuthError(error.message));
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    // Siempre resuelve sin error visible al usuario, exista o no la cuenta —
    // evita que alguien use este formulario para enumerar correos registrados.
    await this.client.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(translateAuthError(error.message));
  }

  async signInWithGoogle(redirectTo: string): Promise<{ url: string }> {
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error || !data.url) throw new Error(translateAuthError(error?.message ?? ''));
    return { url: data.url };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email ?? null };
  }
}
