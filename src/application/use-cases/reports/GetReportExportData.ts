import type { IReportRepository } from '@/domain/repositories/IReportRepository';
import type { ReportTransactionRow } from '@/domain/entities/Report';
import { reportYearSchema } from '@/application/dto/report';

export class GetReportExportData {
  constructor(private readonly reportRepository: IReportRepository) {}

  async execute(userId: string, rawYear: number): Promise<ReportTransactionRow[]> {
    const year = reportYearSchema.parse(rawYear);
    return this.reportRepository.getTransactionsForExport(userId, year);
  }
}
