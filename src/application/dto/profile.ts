import { z } from 'zod';
import { CURRENCIES } from '@/shared/config/currencies';

const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export const LOCALES = [
  { code: 'es-CO', label: 'Español (Colombia)' },
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'en-US', label: 'English (US)' },
] as const;
const LOCALE_CODES = LOCALES.map((l) => l.code) as [string, ...string[]];

export const profileInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(100, 'Máximo 100 caracteres')
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  defaultCurrency: z.enum(CURRENCY_CODES),
  locale: z.enum(LOCALE_CODES),
  theme: z.enum(['dark', 'light', 'system']),
});
export type ProfileInputDto = z.infer<typeof profileInputSchema>;
