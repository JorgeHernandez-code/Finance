import { z } from 'zod';

export const budgetInputSchema = z.object({
  categoryId: z.string().uuid('Selecciona una categoría'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  period: z.enum(['monthly', 'yearly']),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  endDate: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  alertThresholdPercent: z.coerce.number().int().min(1).max(100),
});
export type BudgetInputDto = z.infer<typeof budgetInputSchema>;

export const updateBudgetSchema = budgetInputSchema.extend({ id: z.string().uuid() });
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
