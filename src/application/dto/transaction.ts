import { z } from 'zod';

/**
 * 'transfer' se deja fuera del formulario a propósito por ahora — ver la nota
 * en src/domain/entities/Transaction.ts sobre por qué su contabilidad de
 * doble entrada no está lista todavía.
 */
export const transactionTypeSchema = z.enum(['income', 'expense']);

export const transactionInputSchema = z.object({
  accountId: z.string().uuid('Selecciona una cuenta'),
  categoryId: z.string().uuid('Selecciona una categoría'),
  clientId: z.string().uuid().nullable().optional(),
  type: transactionTypeSchema,
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().trim().min(1, 'Escribe una descripción').max(200, 'Máximo 200 caracteres'),
  notes: z.string().trim().max(1000, 'Máximo 1000 caracteres').nullable().optional(),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida'),
});
export type TransactionInputDto = z.infer<typeof transactionInputSchema>;

export const createTransactionSchema = transactionInputSchema;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = transactionInputSchema.extend({
  id: z.string().uuid(),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  type: z.enum(['all', 'income', 'expense']).default('all'),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type TransactionFiltersDto = z.infer<typeof transactionFiltersSchema>;

export const DEFAULT_TRANSACTION_FILTERS: TransactionFiltersDto = {
  type: 'all',
  page: 1,
  pageSize: 20,
};
