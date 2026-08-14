import { serverEnv } from '@/shared/config/env.server';

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds?: number;
}

interface RateLimitConfig {
  bucket: string;
  maxAttempts: number;
  windowSeconds: number;
}

/**
 * Protección contra fuerza bruta / abuso en los flujos de auth
 * (docs/03-SEGURIDAD.md §5): login, registro y "olvidé mi contraseña".
 *
 * Si hay credenciales de Upstash configuradas, usa un rate limiter
 * distribuido de verdad (sliding window por bucket+identificador). Si no
 * (uso personal en local o antes de configurar Upstash), cae a un
 * limitador en memoria del proceso — no distribuido, se reinicia con el
 * servidor, pero mejor que nada mientras tanto. Se avisa por consola para
 * que no pase desapercibido en producción.
 */
const LOGIN_CONFIG: RateLimitConfig = { bucket: 'login', maxAttempts: 5, windowSeconds: 60 };
const REGISTER_CONFIG: RateLimitConfig = { bucket: 'register', maxAttempts: 3, windowSeconds: 3600 };
const FORGOT_PASSWORD_CONFIG: RateLimitConfig = {
  bucket: 'forgot-password',
  maxAttempts: 3,
  windowSeconds: 3600,
};

const memoryStores = new Map<string, Map<string, number[]>>();
const upstashLimiters = new Map<string, unknown>();
const upstashInitAttempted = new Set<string>();

async function getUpstashLimiter(config: RateLimitConfig) {
  if (upstashInitAttempted.has(config.bucket)) return upstashLimiters.get(config.bucket) ?? null;
  upstashInitAttempted.add(config.bucket);

  if (!serverEnv.UPSTASH_REDIS_REST_URL || !serverEnv.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');

  const limiter = new Ratelimit({
    redis: new Redis({
      url: serverEnv.UPSTASH_REDIS_REST_URL,
      token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(config.maxAttempts, `${config.windowSeconds} s`),
    prefix: `finance:${config.bucket}`,
  });

  upstashLimiters.set(config.bucket, limiter);
  return limiter;
}

function checkMemoryRateLimit(config: RateLimitConfig, identifier: string): RateLimitResult {
  let store = memoryStores.get(config.bucket);
  if (!store) {
    store = new Map();
    memoryStores.set(config.bucket, store);
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        `[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN no configuradas: usando limitador en memoria (no distribuido) para "${config.bucket}". Configura Upstash para producción real.`
      );
    }
  }

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const attempts = (store.get(identifier) ?? []).filter((t) => now - t < windowMs);
  if (attempts.length >= config.maxAttempts) {
    const retryAfterSeconds = Math.ceil((windowMs - (now - attempts[0]!)) / 1000);
    return { success: false, retryAfterSeconds };
  }

  attempts.push(now);
  store.set(identifier, attempts);
  return { success: true };
}

async function checkRateLimit(config: RateLimitConfig, identifier: string): Promise<RateLimitResult> {
  const limiter = await getUpstashLimiter(config);

  if (limiter) {
    const { success, reset } = await (
      limiter as { limit: (id: string) => Promise<{ success: boolean; reset: number }> }
    ).limit(identifier);
    return success ? { success } : { success, retryAfterSeconds: Math.ceil((reset - Date.now()) / 1000) };
  }

  return checkMemoryRateLimit(config, identifier);
}

export function checkLoginRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(LOGIN_CONFIG, identifier);
}

export function checkRegisterRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(REGISTER_CONFIG, identifier);
}

export function checkForgotPasswordRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkRateLimit(FORGOT_PASSWORD_CONFIG, identifier);
}
