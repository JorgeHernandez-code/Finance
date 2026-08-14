import 'server-only';
import { z } from 'zod';

/**
 * Variables de entorno privadas — solo server-side.
 * El import 'server-only' de arriba hace que el build falle explícitamente
 * si algún componente cliente llega a importar este módulo, en vez de
 * filtrar en silencio los nombres de las variables al bundle del navegador.
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

function parseServerEnv() {
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

export const serverEnv = parseServerEnv();
