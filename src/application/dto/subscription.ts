import { z } from 'zod';
import { ICON_NAMES } from '@/shared/config/iconMap';

export const NO_CATEGORY = 'none';
export const NO_ACCOUNT = 'none';
export const NO_CYCLE = 'none';

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
  // NO_CYCLE (o null) = frecuencia desconocida; fecha vacía = día de cobro desconocido. No se inventan.
  billingCycle: z
    .enum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly', NO_CYCLE])
    .nullable()
    .transform((value) => (!value || value === NO_CYCLE ? null : value)),
  nextBillingDate: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Fecha inválida'),
  amountIsEstimate: z.boolean(),
  cycleConfirmed: z.boolean(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  icon: z.enum(ICON_NAMES as [string, ...string[]]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
});
export type SubscriptionInputDto = z.infer<typeof subscriptionInputSchema>;

export const updateSubscriptionSchema = subscriptionInputSchema.extend({ id: z.string().uuid() });
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
