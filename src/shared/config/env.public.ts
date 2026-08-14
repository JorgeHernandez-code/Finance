import { z } from 'zod';

/**
 * Variables de entorno públicas — viajan al bundle del cliente.
 * Separadas de env.server.ts a propósito: si este archivo importara también
 * el esquema de las variables privadas, sus NOMBRES (no solo valores)
 * terminarían incluidos en el JS que se sirve al navegador.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: 'NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida'),
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

export const publicEnv = parsePublicEnv();
