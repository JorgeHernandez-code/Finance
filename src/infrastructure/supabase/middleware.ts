import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/shared/config/env.public';
import { toSessionCookieOptions } from './sessionCookie';

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/auth/callback'];

/**
 * Se ejecuta en cada request (ver src/middleware.ts).
 * Dos responsabilidades:
 *  1. Refrescar el access token si expiró, usando el refresh token de la cookie.
 *  2. Bloquear el acceso a rutas del dashboard si no hay sesión válida.
 *
 * Esta es la primera línea de defensa (UX: redirigir antes de renderizar).
 * La segunda línea, la que realmente protege los datos, es RLS en PostgreSQL.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, toSessionCookieOptions(options))
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
