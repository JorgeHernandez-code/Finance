import { z } from 'zod';
import { ICON_NAMES } from '@/shared/config/iconMap';
import { CURRENCIES } from '@/shared/config/currencies';

const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(60, 'Máximo 60 caracteres'),
  type: z.enum(['cash', 'bank', 'digital_wallet', 'credit_card', 'other']),
  institution: z.string().trim().max(80).nullable().optional(),
  currency: z.enum(CURRENCY_CODES),
  initialBalance: z.coerce.number().min(0, 'No puede ser negativo'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  icon: z.enum(ICON_NAMES as [string, ...string[]]),
});
export type AccountInputDto = z.infer<typeof accountInputSchema>;

export const updateAccountSchema = accountInputSchema.extend({ id: z.string().uuid() });
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
