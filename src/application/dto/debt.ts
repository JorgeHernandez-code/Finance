import { z } from 'zod';
import { CURRENCIES } from '@/shared/config/currencies';

const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Fecha inválida');

const optionalDate = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Fecha inválida');

/** Campo numérico opcional: vacío = desconocido (null), nunca 0 inventado. */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (v) => (v === '' || v === undefined || v === null || Number.isNaN(v) ? null : v),
    z.coerce.number().pipe(schema).nullable()
  );

/** Importes con como máximo 2 decimales (numeric(14,2)). */
const money = z.coerce
  .number()
  .positive('El monto debe ser mayor a 0')
  .max(999_999_999_999, 'Monto demasiado grande')
  .refine((v) => Math.round(v * 100) === Number((v * 100).toFixed(6)), 'Máximo 2 decimales');

export const debtInputSchema = z.object({
  creditorName: z.string().trim().min(1, 'Escribe un nombre').max(100, 'Máximo 100 caracteres'),
  direction: z.enum(['i_owe', 'owed_to_me']),
  kind: z.enum([
    'personal_loan',
    'bank_loan',
    'credit_card',
    'family',
    'friend',
    'commercial',
    'tax',
    'fine',
    'utility',
    'other',
  ]),
  currency: z.enum(CURRENCY_CODES),
  country: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), 'País inválido'),
  principalAmount: money,
  interestRate: optionalNumber(z.number().min(0).max(100)).optional(),
  interestRatePeriod: z.enum(['monthly', 'annual']).nullable().optional(),
  startDate: isoDate,
  dueDate: optionalDate,
  nextPaymentDate: optionalDate,
  installmentAmount: optionalNumber(z.number().positive()).optional(),
  installmentsTotal: optionalNumber(z.number().int().positive()).optional(),
  status: z.enum(['active', 'paid', 'overdue', 'negotiating', 'agreement']),
  priority: z.enum(['high', 'medium', 'low']).nullable().optional(),
  negotiable: z.enum(['yes', 'no', 'unknown']),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type DebtInputDto = z.input<typeof debtInputSchema>;

export const updateDebtSchema = debtInputSchema.extend({ id: z.string().uuid() });
export type UpdateDebtInput = z.input<typeof updateDebtSchema>;

export const debtPaymentInputSchema = z
  .object({
    debtId: z.string().uuid(),
    amount: money,
    paymentDate: isoDate,
    interestAmount: optionalNumber(z.number().min(0)).optional(),
    feesAmount: optionalNumber(z.number().min(0)).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    accountId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    idempotencyKey: z.string().uuid(),
  })
  .refine((v) => (v.interestAmount ?? 0) + (v.feesAmount ?? 0) <= v.amount, {
    message: 'Intereses + cargos no pueden superar el pago',
    path: ['interestAmount'],
  });
export type DebtPaymentInputDto = z.input<typeof debtPaymentInputSchema>;

export const confirmDebtBalanceSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().min(0, 'No puede ser negativo'),
  confirmedAt: isoDate,
});
export type ConfirmDebtBalanceInput = z.input<typeof confirmDebtBalanceSchema>;
