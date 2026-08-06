import type { IReportRepository } from '@/domain/repositories/IReportRepository';
import type { ReportSummary } from '@/domain/entities/Report';
import { reportYearSchema } from '@/application/dto/report';

export class GetYearlyReport {
  constructor(private readonly reportRepository: IReportRepository) {}

  async execute(userId: string, rawYear: number): Promise<ReportSummary> {
    const year = reportYearSchema.parse(rawYear);
    return this.reportRepository.getYearlySummary(userId, year);
  }
}
