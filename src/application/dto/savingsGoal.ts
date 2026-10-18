import { z } from 'zod';
import { ICON_NAMES } from '@/shared/config/iconMap';
import { CURRENCIES } from '@/shared/config/currencies';

const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];
const STATUSES = ['active', 'completed', 'archived', 'paused', 'cancelled'] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida');

export const savingsGoalInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(80, 'Máximo 80 caracteres'),
  // null = pendiente de cotización (no se inventa un precio).
  targetAmount: z.coerce.number().positive('El monto debe ser mayor a 0').max(999_999_999_999).nullable(),
  currency: z.enum(CURRENCY_CODES),
  targetDate: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  accountId: z.string().uuid().nullable().optional(),
  priority: z.coerce.number().int().min(1).max(5),
  plannedMonthlyContribution: z.coerce.number().positive().nullable().optional(),
  isEmergencyFund: z.boolean(),
  icon: z.enum(ICON_NAMES as [string, ...string[]]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  status: z.enum(STATUSES),
});
export type SavingsGoalInputDto = z.input<typeof savingsGoalInputSchema>;

export const updateSavingsGoalSchema = savingsGoalInputSchema.extend({ id: z.string().uuid() });
export type UpdateSavingsGoalInput = z.input<typeof updateSavingsGoalSchema>;

export const setGoalStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(STATUSES) });

export const savingsContributionInputSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  kind: z.enum(['deposit', 'withdrawal']),
  contributionDate: isoDate,
  notes: z.string().trim().max(500).nullable().optional(),
  idempotencyKey: z.string().uuid(),
});
export type SavingsContributionInputDto = z.input<typeof savingsContributionInputSchema>;
