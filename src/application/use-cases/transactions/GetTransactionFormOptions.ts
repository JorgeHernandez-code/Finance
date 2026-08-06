import type { IReferenceDataRepository } from '@/domain/repositories/IReferenceDataRepository';
import type { AccountOption, CategoryOption, ClientOption } from '@/domain/entities/ReferenceOption';

export interface TransactionFormOptions {
  accounts: AccountOption[];
  categories: CategoryOption[];
  clients: ClientOption[];
}

export class GetTransactionFormOptions {
  constructor(private readonly referenceDataRepository: IReferenceDataRepository) {}

  async execute(userId: string): Promise<TransactionFormOptions> {
    const [accounts, categories, clients] = await Promise.all([
      this.referenceDataRepository.listAccounts(userId),
      this.referenceDataRepository.listCategories(userId),
      this.referenceDataRepository.listClients(userId),
    ]);

    return { accounts, categories, clients };
  }
}
