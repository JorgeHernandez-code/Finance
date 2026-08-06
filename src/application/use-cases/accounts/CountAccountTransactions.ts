import { z } from 'zod';
import type { IAccountRepository } from '@/domain/repositories/IAccountRepository';

const idSchema = z.string().uuid();

export class CountAccountTransactions {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(userId: string, rawId: string): Promise<number> {
    const id = idSchema.parse(rawId);
    return this.accountRepository.countTransactions(userId, id);
  }
}
