import type { IAccountRepository } from '@/domain/repositories/IAccountRepository';
import type { Account } from '@/domain/entities/Account';
import { updateAccountSchema, type UpdateAccountInput } from '@/application/dto/account';

export class UpdateAccount {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(userId: string, rawInput: UpdateAccountInput): Promise<Account> {
    const { id, ...rest } = updateAccountSchema.parse(rawInput);
    return this.accountRepository.update(userId, id, rest);
  }
}
