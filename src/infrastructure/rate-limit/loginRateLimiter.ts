import { serverEnv } from '@/shared/config/env';

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds?: number;
}

/**
 * Protección contra fuerza bruta en login (docs/03-SEGURIDAD.md §5).
 *
 * Si hay credenciales de Upstash configuradas, usa un rate limiter
 * distribuido de verdad (sliding window, 5 intentos / 60s por email+IP).
 * Si no (uso personal en local o antes de configurar Upstash), cae a un
 * limitador en memoria del proceso — no distribuido, se reinicia con el
 * servidor, pero mejor que nada mientras tanto. Se avisa por consola para
 * que no pase desapercibido en producción.
 */
let memoryStore: Map<string, number[]> | null = null;
let upstashLimiter: unknown = null;
let upstashInitAttempted = false;

async function getUpstashLimiter() {
  if (upstashInitAttempted) return upstashLimiter;
  upstashInitAttempted = true;

  if (!serverEnv.UPSTASH_REDIS_REST_URL || !serverEnv.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');

  upstashLimiter = new Ratelimit({
    redis: new Redis({
      url: serverEnv.UPSTASH_REDIS_REST_URL,
      token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'finance:login',
  });

  return upstashLimiter;
}

function checkMemoryRateLimit(identifier: string): RateLimitResult {
  if (!memoryStore) {
    memoryStore = new Map();
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN no configuradas: usando limitador en memoria (no distribuido). Configura Upstash para producción real.'
      );
    }
  }

  const now = Date.now();
  const windowMs = 60_000;
  const maxAttempts = 5;

  const attempts = (memoryStore.get(identifier) ?? []).filter((t) => now - t < windowMs);
  if (attempts.length >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - attempts[0]!)) / 1000);
    return { success: false, retryAfterSeconds };
  }

  attempts.push(now);
  memoryStore.set(identifier, attempts);
  return { success: true };
}

export async function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter();

  if (limiter) {
    const { success, reset } = await (
      limiter as { limit: (id: string) => Promise<{ success: boolean; reset: number }> }
    ).limit(identifier);
    return success ? { success } : { success, retryAfterSeconds: Math.ceil((reset - Date.now()) / 1000) };
  }

  return checkMemoryRateLimit(identifier);
}
