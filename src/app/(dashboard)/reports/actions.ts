'use server';

import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseReportRepository } from '@/infrastructure/supabase/repositories/SupabaseReportRepository';
import { GetReportExportData } from '@/application/use-cases/reports/GetReportExportData';
import { reportExportSchema } from '@/application/dto/report';
import type { ReportExportResult } from '@/application/dto/report';
import { buildCsv } from '@/infrastructure/export/buildCsv';
import { buildExcel } from '@/infrastructure/export/buildExcel';
import { buildPdf } from '@/infrastructure/export/buildPdf';

export interface ExportReportActionResult {
  error?: string;
  data?: ReportExportResult;
}

const MIME_TYPES: Record<'csv' | 'xlsx' | 'pdf', string> = {
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export async function exportReportAction(rawInput: { year: number; format: 'csv' | 'xlsx' | 'pdf' }): Promise<ExportReportActionResult> {
  try {
    const { year, format } = reportExportSchema.parse(rawInput);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado.');

    const rows = await new GetReportExportData(new SupabaseReportRepository(supabase)).execute(user.id, year);

    let buffer: Buffer;
    if (format === 'csv') buffer = buildCsv(rows);
    else if (format === 'xlsx') buffer = await buildExcel(rows, year);
    else buffer = await buildPdf(rows, year);

    return {
      data: {
        fileBase64: buffer.toString('base64'),
        fileName: `reporte-${year}.${format}`,
        mimeType: MIME_TYPES[format],
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo generar el archivo de exportación.' };
  }
}
