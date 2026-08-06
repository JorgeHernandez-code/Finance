export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Contrato de autenticación. `application` y `presentation` solo conocen
 * esta interfaz — `infrastructure/supabase/repositories/SupabaseAuthRepository`
 * es la única implementación hoy, pero podría cambiarse sin tocar casos de uso.
 */
export interface IAuthRepository {
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(email: string, password: string, fullName?: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  signInWithGoogle(redirectTo: string): Promise<{ url: string }>;
  getCurrentUser(): Promise<AuthUser | null>;
}
