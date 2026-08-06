import { z } from 'zod';
import type { IAccountRepository } from '@/domain/repositories/IAccountRepository';

const inputSchema = z.object({ id: z.string().uuid(), archived: z.boolean() });

export class ArchiveAccount {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(userId: string, rawInput: { id: string; archived: boolean }): Promise<void> {
    const { id, archived } = inputSchema.parse(rawInput);
    await this.accountRepository.setArchived(userId, id, archived);
  }
}
