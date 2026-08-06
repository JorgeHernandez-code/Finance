import { redirect } from 'next/navigation';

/**
 * "/" no está en PUBLIC_ROUTES (src/infrastructure/supabase/middleware.ts),
 * así que el middleware ya garantiza que solo se llega aquí con sesión
 * válida — este componente solo decide a dónde mandar a un usuario autenticado.
 */
export default function Home() {
  redirect('/dashboard');
}
