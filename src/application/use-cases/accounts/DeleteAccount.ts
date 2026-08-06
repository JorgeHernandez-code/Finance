import { z } from 'zod';
import type { IAccountRepository } from '@/domain/repositories/IAccountRepository';

const idSchema = z.string().uuid();

/** Borrado físico: la FK de transactions es ON DELETE CASCADE, borra también sus movimientos. La UI debe confirmar esto explícitamente antes de llamar. */
export class DeleteAccount {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(userId: string, rawId: string): Promise<void> {
    const id = idSchema.parse(rawId);
    await this.accountRepository.delete(userId, id);
  }
}
