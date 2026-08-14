import { createBrowserClient, type CookieOptions } from '@supabase/ssr';
import { publicEnv } from '@/shared/config/env.public';
import type { Database } from '@/shared/types/database';
import { toSessionCookieOptions } from './sessionCookie';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Cliente de Supabase para uso en Client Components.
 * Usa la anon key pública — segura de exponer porque toda autorización
 * real la impone Row Level Security en PostgreSQL (ver docs/02-BASE-DE-DATOS.md).
 * Tipado con Database: autocompletado y chequeo de tipos en cada tabla/vista.
 *
 * Se pasa un `cookies.getAll/setAll` propio (en vez de dejar que la librería
 * use `document.cookie` internamente) para poder despojar `maxAge`/`expires`
 * antes de escribir — así la sesión no sobrevive al cierre del navegador.
 * Ver src/infrastructure/supabase/sessionCookie.ts.
 */
export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return [];
          return document.cookie
            .split('; ')
            .filter(Boolean)
            .map((pair): { name: string; value: string } => {
              const eqIndex = pair.indexOf('=');
              if (eqIndex === -1) return { name: pair, value: '' };
              return { name: pair.slice(0, eqIndex), value: decodeURIComponent(pair.slice(eqIndex + 1)) };
            });
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const sessionOptions = toSessionCookieOptions(options);
            const parts = [`${name}=${encodeURIComponent(value)}`, `path=${sessionOptions.path ?? '/'}`];
            if (sessionOptions.sameSite) parts.push(`SameSite=${sessionOptions.sameSite}`);
            if (sessionOptions.secure) parts.push('Secure');
            document.cookie = parts.join('; ');
          });
        },
      },
    }
  );
}
