import type { IBackupRepository } from '@/domain/repositories/IBackupRepository';
import type { BackupBundle } from '@/domain/entities/Backup';

export class ExportBackupData {
  constructor(private readonly backupRepository: IBackupRepository) {}

  async execute(userId: string): Promise<BackupBundle> {
    return this.backupRepository.exportAll(userId);
  }
}
