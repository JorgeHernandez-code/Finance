'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseProfileRepository } from '@/infrastructure/supabase/repositories/SupabaseProfileRepository';
import { SupabaseBackupRepository } from '@/infrastructure/supabase/repositories/SupabaseBackupRepository';
import { UpdateProfile } from '@/application/use-cases/profile/UpdateProfile';
import { ExportBackupData } from '@/application/use-cases/backup/ExportBackupData';
import { ImportBackupData } from '@/application/use-cases/backup/ImportBackupData';
import { backupExportPassphraseSchema, backupImportSchema } from '@/application/dto/backup';
import type { ProfileInputDto } from '@/application/dto/profile';
import type { BackupBundleDto, BackupExportResult, BackupImportInputDto } from '@/application/dto/backup';
import type { BackupImportSummary } from '@/domain/entities/Backup';
import { encryptJson, decryptJson } from '@/infrastructure/export/backupCrypto';

export interface ProfileActionResult {
  error?: string;
  success?: boolean;
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado.');
  return { supabase, userId: user.id };
}

export async function updateProfileAction(input: ProfileInputDto): Promise<ProfileActionResult> {
  try {
    const { supabase, userId } = await requireUserId();
    await new UpdateProfile(new SupabaseProfileRepository(supabase)).execute(userId, input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo actualizar el perfil.' };
  }
  revalidatePath('/settings');
  return { success: true };
}

export interface BackupExportActionResult {
  error?: string;
  data?: BackupExportResult;
}

export async function exportBackupAction(rawPassphrase: string): Promise<BackupExportActionResult> {
  try {
    const passphrase = backupExportPassphraseSchema.parse(rawPassphrase);
    const { supabase, userId } = await requireUserId();

    const bundle = await new ExportBackupData(new SupabaseBackupRepository(supabase)).execute(userId);
    const encrypted = encryptJson(bundle, passphrase);

    return {
      data: {
        fileBase64: Buffer.from(encrypted, 'utf-8').toString('base64'),
        fileName: `finance-backup-${new Date().toISOString().slice(0, 10)}.json`,
        mimeType: 'application/json',
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo generar el respaldo.' };
  }
}

export interface BackupImportActionResult {
  error?: string;
  data?: BackupImportSummary;
}

export async function importBackupAction(rawInput: BackupImportInputDto): Promise<BackupImportActionResult> {
  try {
    const { fileContent, passphrase } = backupImportSchema.parse(rawInput);
    const { supabase, userId } = await requireUserId();

    const bundle = decryptJson<BackupBundleDto>(fileContent, passphrase);
    const summary = await new ImportBackupData(new SupabaseBackupRepository(supabase)).execute(userId, bundle);

    revalidatePath('/', 'layout');
    return { data: summary };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.' };
  }
}
