import type { IBackupRepository } from '@/domain/repositories/IBackupRepository';
import type { BackupImportSummary } from '@/domain/entities/Backup';
import { backupBundleSchema, type BackupBundleDto } from '@/application/dto/backup';

export class ImportBackupData {
  constructor(private readonly backupRepository: IBackupRepository) {}

  async execute(userId: string, rawBundle: BackupBundleDto): Promise<BackupImportSummary> {
    const bundle = backupBundleSchema.parse(rawBundle);
    return this.backupRepository.importAll(userId, bundle);
  }
}
