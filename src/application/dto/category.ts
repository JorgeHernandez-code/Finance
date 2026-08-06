import { z } from 'zod';
import { ICON_NAMES } from '@/shared/config/iconMap';

export const NO_PARENT_CATEGORY = 'none';

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(60, 'Máximo 60 caracteres'),
  type: z.enum(['income', 'expense']),
  parentId: z
    .string()
    .nullable()
    .optional()
    .transform((value) => (!value || value === NO_PARENT_CATEGORY ? null : value)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  icon: z.enum(ICON_NAMES as [string, ...string[]]),
});
export type CategoryInputDto = z.infer<typeof categoryInputSchema>;

export const updateCategorySchema = categoryInputSchema.extend({ id: z.string().uuid() });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
