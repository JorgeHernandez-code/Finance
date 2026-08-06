import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const reportYearSchema = z.coerce.number().int().min(2000).max(currentYear + 1);

export const reportExportSchema = z.object({
  year: reportYearSchema,
  format: z.enum(['csv', 'xlsx', 'pdf']),
});
export type ReportExportDto = z.infer<typeof reportExportSchema>;

export interface ReportExportResult {
  fileBase64: string;
  fileName: string;
  mimeType: string;
}
