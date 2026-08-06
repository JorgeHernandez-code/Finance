import { z } from 'zod';
import { ICON_NAMES } from '@/shared/config/iconMap';

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(80, 'Máximo 80 caracteres'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  icon: z.enum(ICON_NAMES as [string, ...string[]]),
  status: z.enum(['active', 'inactive']),
  notes: z.string().trim().max(1000, 'Máximo 1000 caracteres').nullable().optional(),
});
export type ClientInputDto = z.infer<typeof clientInputSchema>;

export const updateClientSchema = clientInputSchema.extend({ id: z.string().uuid() });
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
