import type { BackupBundle, BackupImportSummary } from '@/domain/entities/Backup';

export interface IBackupRepository {
  exportAll(userId: string): Promise<BackupBundle>;
  importAll(userId: string, bundle: BackupBundle): Promise<BackupImportSummary>;
}
