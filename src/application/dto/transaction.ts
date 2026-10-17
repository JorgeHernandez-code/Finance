import { z } from 'zod';

/** Las transferencias tienen su propio esquema (transferInputSchema, más abajo). */
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
  idempotencyKey: z.string().uuid().nullable().optional(),
});
export type TransactionInputDto = z.infer<typeof transactionInputSchema>;

export const transferInputSchema = z
  .object({
    fromAccountId: z.string().uuid('Selecciona la cuenta de origen'),
    toAccountId: z.string().uuid('Selecciona la cuenta de destino'),
    amountOut: z.coerce.number().positive('El monto debe ser mayor a 0'),
    amountIn: z.coerce.number().positive('El monto recibido debe ser mayor a 0'),
    description: z.string().trim().min(1, 'Escribe una descripción').max(200),
    notes: z.string().trim().max(1000).nullable().optional(),
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    idempotencyKey: z.string().uuid(),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: 'Elige dos cuentas distintas',
    path: ['toAccountId'],
  });
export type TransferInputDto = z.infer<typeof transferInputSchema>;

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
