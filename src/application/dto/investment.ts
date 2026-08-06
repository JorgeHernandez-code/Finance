import { z } from 'zod';

export const investmentInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(100, 'Máximo 100 caracteres'),
  type: z.enum(['stocks', 'crypto', 'real_estate', 'business', 'other']),
  amountInvested: z.coerce.number().positive('El monto debe ser mayor a 0'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type InvestmentInputDto = z.infer<typeof investmentInputSchema>;

export const updateInvestmentSchema = investmentInputSchema.extend({ id: z.string().uuid() });
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;

export const investmentValuationInputSchema = z.object({
  investmentId: z.string().uuid(),
  value: z.coerce.number().min(0, 'El valor no puede ser negativo'),
  valuationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
});
export type InvestmentValuationInputDto = z.infer<typeof investmentValuationInputSchema>;
