import type { CookieOptions } from '@supabase/ssr';

/**
 * @supabase/ssr siempre escribe la cookie de sesión con maxAge = 400 días
 * (su DEFAULT_COOKIE_OPTIONS), sin importar qué le pasemos en `cookieOptions`
 * al crear el cliente — es un valor fijo en su código interno, no configurable.
 *
 * Requisito de seguridad del usuario: la sesión no debe sobrevivir al cierre
 * completo del navegador — cada vez que lo abre, debe iniciar sesión de nuevo.
 * Para lograrlo sin pelear con la librería, interceptamos el único punto que
 * si controlamos nosotros: la escritura final de la cookie (document.cookie
 * en el navegador, cookieStore.set en el servidor). Quitamos `maxAge` y
 * `expires` justo antes de escribir, así el navegador la trata como "cookie
 * de sesión" (vive en memoria, se borra al cerrar todas las ventanas — no en
 * cada recarga de página ni al cambiar de pestaña).
 */
export function toSessionCookieOptions(options?: CookieOptions): CookieOptions {
  const rest: CookieOptions = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
