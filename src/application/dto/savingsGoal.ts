import { z } from 'zod';
import { ICON_NAMES } from '@/shared/config/iconMap';

export const savingsGoalInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(80, 'Máximo 80 caracteres'),
  targetAmount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  targetDate: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  icon: z.enum(ICON_NAMES as [string, ...string[]]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  status: z.enum(['active', 'completed', 'archived']),
});
export type SavingsGoalInputDto = z.infer<typeof savingsGoalInputSchema>;

export const updateSavingsGoalSchema = savingsGoalInputSchema.extend({ id: z.string().uuid() });
export type UpdateSavingsGoalInput = z.infer<typeof updateSavingsGoalSchema>;

export const savingsContributionInputSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  contributionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type SavingsContributionInputDto = z.infer<typeof savingsContributionInputSchema>;
