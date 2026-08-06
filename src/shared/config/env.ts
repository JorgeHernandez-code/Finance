import { z } from 'zod';

/**
 * Validación de variables de entorno en tiempo de arranque.
 *
 * Por qué: si falta o está mal una env var crítica (ej. la URL de Supabase),
 * es mejor que la app falle inmediatamente con un error claro al iniciar,
 * que descubrirlo en producción con un fetch fallando en silencio.
 *
 * Buena práctica de seguridad: separa explícitamente lo público (viaja al
 * bundle del cliente) de lo privado (solo server-side), para que sea
 * imposible importar por error una clave privada en un componente cliente.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: 'NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida'),
});

/**
 * Una env var vacía en .env.local (ej. `FIELD_ENCRYPTION_KEY=` sin valor)
 * llega a process.env como "" — no como undefined. Sin este preprocess,
 * `.optional()` no la perdona y el arranque falla aunque la variable sea
 * legítimamente opcional en esta fase. Se normaliza "" -> undefined antes
 * de validar.
 */
const emptyToUndefined = (val: unknown) => (val === '' ? undefined : val);
const optionalString = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = () => z.preprocess(emptyToUndefined, z.string().url().optional());

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalString(),
  FIELD_ENCRYPTION_KEY: optionalString(),
  UPSTASH_REDIS_REST_URL: optionalUrl(),
  UPSTASH_REDIS_REST_TOKEN: optionalString(),
  ANTHROPIC_API_KEY: optionalString(),
});

function parsePublicEnv() {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Variables de entorno públicas inválidas o faltantes:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')}\n\nRevisa tu .env.local contra .env.example.`
    );
  }

  return parsed.data;
}

function parseServerEnv() {
  // Solo se valida en runtime de servidor; en el bundle de cliente estas
  // variables ni siquiera existen (Next.js las excluye por no tener prefijo NEXT_PUBLIC_).
  if (typeof window !== 'undefined') {
    return {} as z.infer<typeof serverEnvSchema>;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variables de entorno de servidor inválidas:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')}`
    );
  }
  return parsed.data;
}

export const publicEnv = parsePublicEnv();
export const serverEnv = parseServerEnv();
