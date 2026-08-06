import type { ReportSummary, ReportTransactionRow } from '@/domain/entities/Report';

export interface IReportRepository {
  getYearlySummary(userId: string, year: number): Promise<ReportSummary>;
  getTransactionsForExport(userId: string, year: number): Promise<ReportTransactionRow[]>;
}
