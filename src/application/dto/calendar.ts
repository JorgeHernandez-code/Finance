import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

export const calendarRangeSchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((value) => value.from <= value.to, { message: 'El rango de fechas es inválido' });
export type CalendarRangeDto = z.infer<typeof calendarRangeSchema>;
