import { z } from 'zod';

export const debtInputSchema = z.object({
  creditorName: z.string().trim().min(1, 'Escribe un nombre').max(100, 'Máximo 100 caracteres'),
  direction: z.enum(['i_owe', 'owed_to_me']),
  principalAmount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  interestRate: z.coerce.number().min(0).max(100).nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  status: z.enum(['active', 'paid', 'overdue']),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type DebtInputDto = z.infer<typeof debtInputSchema>;

export const updateDebtSchema = debtInputSchema.extend({ id: z.string().uuid() });
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;

export const debtPaymentInputSchema = z.object({
  debtId: z.string().uuid(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type DebtPaymentInputDto = z.infer<typeof debtPaymentInputSchema>;
