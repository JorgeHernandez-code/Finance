import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/shared/config/env.public';
import type { Database } from '@/shared/types/database';
import { toSessionCookieOptions } from './sessionCookie';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente de Supabase para Server Components / Server Actions / Route Handlers.
 * La sesión viaja en cookies HttpOnly (nunca localStorage) — ver docs/03-SEGURIDAD.md §1.
 *
 * `setAll` puede fallar en Server Components puros (no pueden escribir cookies);
 * se ignora ese error a propósito porque el refresco real de sesión ocurre en
 * el middleware (src/middleware.ts), que sí puede escribir cookies.
 *
 * `toSessionCookieOptions` despoja `maxAge`/`expires` antes de escribir, para
 * que la cookie muera al cerrar el navegador en vez de durar 400 días
 * (el default fijo de @supabase/ssr). Ver sessionCookie.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, toSessionCookieOptions(options));
            });
          } catch {
            // Se ejecuta desde un Server Component sin permiso de escritura — esperado.
          }
        },
      },
    }
  );
}
