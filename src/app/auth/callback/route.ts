import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/infrastructure/supabase/server';

/**
 * Punto de retorno único para dos flujos que usan OAuth/PKCE por debajo:
 *  - Login con Google (googleSignInAction)
 *  - Recuperar contraseña (RequestPasswordReset) — el link del correo apunta
 *    aquí con ?next=/reset-password antes de llegar a la pantalla real.
 *
 * `exchangeCodeForSession` es lo que efectivamente crea las cookies HttpOnly
 * de sesión (ver docs/03-SEGURIDAD.md §1) — sin este paso el usuario nunca
 * queda autenticado tras volver de Google o del correo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
