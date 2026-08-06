import type { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import type { Account } from '@/domain/entities/Account';

export class ListAccounts {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(userId: string): Promise<Account[]> {
    return this.accountRepository.list(userId);
  }
}
