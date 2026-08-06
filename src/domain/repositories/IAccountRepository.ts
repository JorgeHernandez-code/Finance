import type { Account, AccountType } from '@/domain/entities/Account';

export interface AccountInput {
  name: string;
  type: AccountType;
  institution?: string | null;
  currency: string;
  initialBalance: number;
  color: string;
  icon: string;
}

export interface IAccountRepository {
  list(userId: string): Promise<Account[]>;
  create(userId: string, input: AccountInput): Promise<Account>;
  update(userId: string, id: string, input: AccountInput): Promise<Account>;
  setArchived(userId: string, id: string, archived: boolean): Promise<void>;
  /** Borrado físico — la FK de transactions.account_id es ON DELETE CASCADE, así que esto borra también sus transacciones. */
  delete(userId: string, id: string): Promise<void>;
  countTransactions(userId: string, id: string): Promise<number>;
}
