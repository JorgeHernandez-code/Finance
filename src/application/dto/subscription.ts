import { z } from 'zod';
import { ICON_NAMES } from '@/shared/config/iconMap';

export const NO_CATEGORY = 'none';
export const NO_ACCOUNT = 'none';

const optionalId = (none: string) =>
  z
    .string()
    .nullable()
    .optional()
    .transform((value) => (!value || value === none ? null : value));

export const subscriptionInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(80, 'Máximo 80 caracteres'),
  kind: z.enum([
    'subscription',
    'rent',
    'utilities',
    'food',
    'transport',
    'phone',
    'internet',
    'loan_installment',
    'personal',
    'business',
    'extraordinary',
    'other',
  ]),
  isEssential: z.boolean(),
  debtId: optionalId('__none'),
  categoryId: optionalId(NO_CATEGORY),
  accountId: optionalId(NO_ACCOUNT),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().length(3),
  billingCycle: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  nextBillingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  icon: z.enum(ICON_NAMES as [string, ...string[]]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
});
export type SubscriptionInputDto = z.infer<typeof subscriptionInputSchema>;

export const updateSubscriptionSchema = subscriptionInputSchema.extend({ id: z.string().uuid() });
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
