import type { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import type { Account } from '@/domain/entities/Account';
import { accountInputSchema, type AccountInputDto } from '@/application/dto/account';

export class CreateAccount {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(userId: string, rawInput: AccountInputDto): Promise<Account> {
    const input = accountInputSchema.parse(rawInput);
    return this.accountRepository.create(userId, input);
  }
}
