import { type NextRequest } from 'next/server';
import { updateSession } from '@/infrastructure/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corre en todas las rutas excepto assets estáticos y archivos internos de Next.js,
     * para no gastar cómputo en cada imagen/CSS. Ajustar si se agregan más carpetas públicas.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
