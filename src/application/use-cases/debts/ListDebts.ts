import type { IDebtRepository } from '@/domain/repositories/IDebtRepository';
import type { Debt } from '@/domain/entities/Debt';

export class ListDebts {
  constructor(private readonly debtRepository: IDebtRepository) {}

  async execute(userId: string): Promise<Debt[]> {
    return this.debtRepository.list(userId);
  }
}
